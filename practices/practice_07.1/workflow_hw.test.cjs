const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, 'workflow_hw.json'), 'utf8'));
const nodes = new Map(workflow.nodes.map(node => [node.name, node]));
const repository = 'WildBoar228/ITMOv2';
const head = 'a'.repeat(40);
const base = 'b'.repeat(40);
const mainModel = 'openai/gpt-5.5';
const otherModel = 'deepseek/deepseek-v4.1-flash-1017';

function context(branch = 'main') {
  return {
    pr_id: `${repository}#42`, repository, pr_number: 42,
    model: branch === 'main' ? mainModel : otherModel, review_branch: branch,
  };
}

function files() {
  return [
    {
      filename: 'src/расчёт с пробелом.py', previous_filename: 'src/old.py',
      status: 'renamed', additions: 3, deletions: 2,
      patch: '@@ -10,3 +10,4 @@ def divide():\n     value = 1\n-    return value\n+    count = len(items)\n+    return value / count\n     # done\n@@ -30 +31 @@\n-old\n+new\n',
    },
    {
      filename: 'removed.py', status: 'removed', additions: 0, deletions: 2,
      patch: '@@ -1,2 +0,0 @@\n-old1\n-old2\n\\ No newline at end of file\n',
    },
    {
      filename: 'added.txt', status: 'added', additions: 2, deletions: 0,
      patch: '@@ -0,0 +1,2 @@\r\n+hello\r\n+\r\n\\ No newline at end of file\r\n',
    },
    { filename: 'image.png', status: 'modified', additions: 0, deletions: 0 },
  ];
}

function metadata(list = files()) {
  return { number: 42, changed_files: list.length, head: { sha: head }, base: { sha: base, repo: { full_name: repository } } };
}

function executeCode(name, items, history) {
  const lookup = nodeName => {
    assert(history.has(nodeName), `Reference to unexecuted node: ${nodeName}`);
    return { first: () => history.get(nodeName)[0], all: () => history.get(nodeName) };
  };
  return new Function('$input', '$', nodes.get(name).parameters.jsCode)(
    { all: () => items, first: () => items[0] }, lookup,
  );
}

function split(list = files(), pr = metadata(list), ctx = context()) {
  const history = new Map([
    ['Prepare Review Context', [{ json: ctx }]],
    ['Get PR Metadata', [{ json: pr }]],
  ]);
  return executeCode('Split PR Into Hunks', list.length ? list.map(json => ({ json })) : [{ json: {} }], history)[0].json;
}

function answer(source) {
  return {
    comments: source.blocks.map(block => ({
      block_id: block.block_id,
      anchor_id: (block.anchors.find(anchor => anchor.side === 'RIGHT') ?? block.anchors.at(-1)).id,
      body: 'Проверьте граничный случай.\nДобавьте обработку ошибки.',
    })),
  };
}

function build(source, output = answer(source)) {
  const history = new Map([['Split PR Into Hunks', [{ json: source }]]]);
  return executeCode('Build Inline Review', [{ json: { output } }], history)[0].json;
}

function command(text, action = 'created', isPR = true) {
  return { body: {
    action, repository: { full_name: repository }, issue: { number: 42, ...(isPR ? { pull_request: {} } : {}) },
    comment: { body: text },
  } };
}

// Execute the actual exported routing and Code expressions with mocked GitHub/LLM I/O.
// Real webhook delivery, model responses and GitHub validation are checked in n8n.
function run(start, payload, rows, options = {}) {
  const history = new Map();
  const queue = [[start, [{ json: payload }]]];
  const trace = [];
  const published = [];
  const list = options.files ?? files();
  const evaluate = (value, json) => {
    if (typeof value !== 'string' || !value.startsWith('=')) return value;
    const lookup = name => {
      assert(history.has(name), `Reference to unexecuted node: ${name}`);
      return { first: () => history.get(name)[0] };
    };
    const expression = code => new Function('$json', '$', `return (${code});`)(json, lookup);
    return value.startsWith('={{')
      ? expression(value.slice(3, -2).trim())
      : value.slice(1).replace(/{{([\s\S]*?)}}/g, (_, code) => expression(code.trim()));
  };
  while (queue.length) {
    assert(trace.length < 60, 'Unexpected workflow cycle');
    const [name, items] = queue.shift();
    const node = nodes.get(name);
    assert(node, name);
    trace.push(name);
    const p = node.parameters;
    const input = items[0].json;
    let output = items;
    let branch = 0;
    if (node.type === 'n8n-nodes-base.if') {
      branch = p.conditions.conditions.every(c => evaluate(c.leftValue, input) === true) ? 0 : 1;
    } else if (node.type === 'n8n-nodes-base.set') {
      output = [{ json: Object.fromEntries(p.assignments.assignments.map(field => {
        const value = evaluate(field.value, input);
        assert.equal(typeof value, field.type, field.name);
        return [field.name, value];
      })) }];
    } else if (node.type === 'n8n-nodes-base.dataTable') {
      if (p.operation === 'rowNotExists') {
        assert.equal(p.matchType, 'allConditions');
        const exists = rows.some(row => p.filters.conditions.every(c => row[c.keyName] === evaluate(c.keyValue, input)));
        if (exists) continue;
      } else {
        assert.equal(p.operation ?? 'insert', 'insert');
        const row = Object.fromEntries(Object.entries(p.columns.value).map(([key, value]) => [key, evaluate(value, input)]));
        for (const column of p.columns.schema) assert.equal(typeof row[column.id], column.type, column.id);
        rows.push(row);
        output = [{ json: row }];
      }
    } else if (node.type === 'n8n-nodes-base.code') {
      output = executeCode(name, items, history);
    } else if (node.type.endsWith('.agent')) {
      const modelNodes = Object.entries(workflow.connections)
        .filter(([, outputs]) => (outputs.ai_languageModel ?? []).flat().some(edge => edge.node === name));
      assert.equal(modelNodes.length, 1);
      assert.equal(nodes.get(modelNodes[0][0]).parameters.model.value, input.model);
      assert.equal(p.hasOutputParser, true);
      output = [{ json: { output: options.modelAnswer ?? answer(input) } }];
    } else if (node.type === 'n8n-nodes-base.httpRequest') {
      const url = evaluate(p.url, input);
      const prUrl = `https://api.github.com/repos/${repository}/pulls/42`;
      if (name === 'Get PR Metadata') {
        assert.equal(url, prUrl);
        output = [{ json: metadata(list) }];
      } else if (name === 'Get PR Files') {
        assert.equal(url, `${prUrl}/files`);
        output = list.length ? list.map(json => ({ json })) : [{ json: {} }];
      } else if (name === 'Check PR Snapshot') {
        assert.equal(url, prUrl);
        const current = metadata(list);
        if (options.changedHead) current.head.sha = 'c'.repeat(40);
        if (options.changedBase) current.base.sha = 'd'.repeat(40);
        output = [{ json: current }];
      } else {
        assert.equal(p.method, 'POST');
        assert.equal(url, `${prUrl}/reviews`);
        assert.equal(p.nodeCredentialType, 'githubApi');
        assert(node.credentials.githubApi);
        const review = evaluate(p.jsonBody, input);
        assert.equal(review.event, 'COMMENT');
        assert.equal(review.commit_id, head);
        if (options.failPublish) throw new Error('Mock GitHub publication failed');
        published.push({ model: input.model, review });
        output = [{ json: { html_url: `https://github.com/${repository}/pull/42#pullrequestreview-${published.length}` } }];
      }
    } else if (node.type === 'n8n-nodes-base.github') {
      assert.equal(evaluate(p.issueNumber, input), 42);
    }
    history.set(name, output);
    for (const edge of workflow.connections[name]?.main?.[branch] ?? []) queue.push([edge.node, output]);
  }
  return { trace, published };
}

test('workflow references, trigger webhook IDs, parser and pagination are configured', () => {
  assert.equal(nodes.size, workflow.nodes.length);
  assert.equal(new Set(workflow.nodes.map(n => n.id)).size, workflow.nodes.length);
  const triggers = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.githubTrigger');
  assert.equal(new Set(triggers.map(n => n.webhookId)).size, triggers.length);
  for (const [source, outputs] of Object.entries(workflow.connections)) {
    assert(nodes.has(source), source);
    for (const [type, branches] of Object.entries(outputs)) {
      for (const branch of branches) for (const edge of branch) {
        assert(nodes.has(edge.node), edge.node);
        assert.equal(edge.type, type);
      }
    }
  }
  for (const name of ['Only Unreviewed PRs', 'Only Unreviewed Other PRs']) {
    const node = nodes.get(name);
    assert.equal(node.alwaysOutputData, false);
    assert.equal(node.parameters.matchType, 'allConditions');
    assert.deepEqual(node.parameters.filters.conditions.map(c => c.keyName), ['pr_id', 'model']);
  }
  const parser = nodes.get('Hunk Review Output Parser');
  const schema = JSON.parse(parser.parameters.inputSchema);
  assert.deepEqual(schema.properties.comments.items.required, ['block_id', 'anchor_id', 'body']);
  assert.deepEqual(workflow.connections[parser.name].ai_outputParser[0].map(edge => edge.node).sort(),
    ['Code Review Agent', 'Code Review Agent1']);
  const pagination = nodes.get('Get PR Files').parameters.options.pagination.pagination;
  assert.equal(pagination.parameters.parameters[0].value, '={{ $pageCount + 1 }}');
  assert.equal(pagination.completeExpression, '={{ $response.body.length < 100 }}');
  assert.equal(nodes.get('Get PR Files').alwaysOutputData, true);
});

test('hunks have real old/new line numbers, including zero ranges, CRLF, rename and no-newline marker', () => {
  const result = split();
  assert.equal(result.blocks.length, 4);
  assert.equal(result.commit_sha, head);
  assert.deepEqual(result.skipped_files, ['image.png']);
  assert.deepEqual(result.blocks[0].anchors, [
    { id: 'L11', line: 11, side: 'LEFT' },
    { id: 'R11', line: 11, side: 'RIGHT' },
    { id: 'R12', line: 12, side: 'RIGHT' },
  ]);
  assert.deepEqual(result.blocks[1].anchors.map(a => a.line), [30, 31]);
  assert.deepEqual(result.blocks[2].anchors, [
    { id: 'L1', line: 1, side: 'LEFT' }, { id: 'L2', line: 2, side: 'LEFT' },
  ]);
  assert.deepEqual(result.blocks[3].anchors, [
    { id: 'R1', line: 1, side: 'RIGHT' }, { id: 'R2', line: 2, side: 'RIGHT' },
  ]);
  assert(result.blocks[0].patch.includes('\n+'));
  assert(!result.blocks[0].patch.includes('\\n'));
});

test('incomplete pagination, truncated patch, missing hunks and duplicate files fail before publication', () => {
  assert.throws(() => split(files().slice(0, 1), metadata()), /неполный список/);
  const truncated = files();
  truncated[0].patch = truncated[0].patch.replace('     # done\n', '');
  assert.throws(() => split(truncated), /Неполный patch/);
  const incomplete = files();
  incomplete[0].additions += 1;
  assert.throws(() => split(incomplete), /не покрывает/);
  const duplicates = [files()[0], files()[0]];
  assert.throws(() => split(duplicates), /повторяется путь/);
  assert.throws(() => split([], { ...metadata([]), changed_files: 3001 }), /3000/);
});

test('review has one validated inline comment per block, in patch order', () => {
  const source = split();
  const result = answer(source);
  result.comments.reverse();
  const built = build(source, result);
  assert.equal(built.review.comments.length, 4);
  assert.equal(built.review.commit_id, head);
  assert.equal(built.review.event, 'COMMENT');
  assert.deepEqual(built.review.comments.map(c => [c.path, c.line, c.side]), [
    ['src/расчёт с пробелом.py', 11, 'RIGHT'],
    ['src/расчёт с пробелом.py', 31, 'RIGHT'],
    ['removed.py', 2, 'LEFT'],
    ['added.txt', 1, 'RIGHT'],
  ]);
  assert(built.review.comments[0].body.includes('\n\n'));
  assert(built.review.body.includes('\n- image.png'));
  assert(!built.review.body.includes('\\n'));
});

test('unknown, duplicate, missing or invalid model anchors are rejected', () => {
  const source = split();
  for (const change of [
    result => { result.comments[0].block_id = 'unknown'; },
    result => { result.comments[0].anchor_id = 'R9999'; },
    result => { result.comments[0].body = '  '; },
    result => { result.comments[0].body = 'x'.repeat(6001); },
    result => { result.comments.pop(); },
    result => { result.comments.push(result.comments[0]); },
  ]) {
    const result = answer(source);
    change(result);
    assert.throws(() => build(source, result));
  }
  assert.throws(() => build(source, 'plain text'), /структурированный/);
});

test('PR + model deduplication allows the other model and skips repetitions', () => {
  const rows = [];
  const first = run('PR Comment Trigger', command('/make_ai_review'), rows);
  assert.equal(first.published.length, 1);
  assert.equal(first.published[0].review.comments.length, 4);
  const second = run('PR Comment Trigger', command('/make_other_ai_review'), rows);
  assert.equal(second.published.length, 1);
  assert.equal(second.published[0].model, otherModel);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => [row.pr_id, row.model]), [[`${repository}#42`, mainModel], [`${repository}#42`, otherModel]]);
  for (const [text, gate] of [
    ['/make_ai_review', 'Only Unreviewed PRs'], ['/make_other_ai_review', 'Only Unreviewed Other PRs'],
  ]) {
    const repeat = run('PR Comment Trigger', command(text), rows);
    assert.equal(repeat.trace.at(-1), gate);
    assert.equal(repeat.published.length, 0);
    assert(!repeat.trace.includes('Get PR Metadata'));
  }
  assert.equal(rows.length, 2);
});

test('automatic opening uses the main model and does not run for labels or unrelated comments', () => {
  const opened = { body: { action: 'opened', number: 42, repository: { full_name: repository }, pull_request: {} } };
  const rows = [];
  const result = run('PR Trigger1', opened, rows);
  assert.equal(result.published[0].model, mainModel);
  assert.equal(rows.length, 1);
  const labeled = structuredClone(opened);
  labeled.body.action = 'labeled';
  assert.equal(run('PR Trigger1', labeled, rows).trace.at(-1), 'Is PR Opened');
  for (const input of [command('hello'), command('/make_ai_review', 'edited'), command('/make_other_ai_review', 'created', false)]) {
    assert.equal(run('PR Comment Trigger', input, []).published.length, 0);
  }
});

test('head/base changes and failed publication leave the PR + model eligible for retry', () => {
  for (const option of [{ changedHead: true }, { changedBase: true }, { failPublish: true }]) {
    const rows = [];
    assert.throws(() => run('PR Comment Trigger', command('/make_other_ai_review'), rows, option));
    assert.equal(rows.length, 0);
    assert.equal(run('PR Comment Trigger', command('/make_other_ai_review'), rows).published.length, 1);
    assert.equal(rows.length, 1);
  }
});

test('binary-only and empty diffs skip the model and publish an explicit summary', () => {
  for (const list of [[files().at(-1)], []]) {
    const rows = [];
    const result = run('PR Comment Trigger', command('/make_other_ai_review'), rows, { files: list });
    assert(!result.trace.includes('Code Review Agent'));
    assert(!result.trace.includes('Code Review Agent1'));
    assert.deepEqual(result.published[0].review.comments, []);
    assert(result.published[0].review.body.includes('модель не вызывалась'));
    assert.equal(rows.length, 1);
  }
});
