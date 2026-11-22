import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(project, '../prototype_screenshots');
const decks = JSON.parse(await readFile(path.join(project, 'public/data/decks.json'), 'utf8'));
const url = 'http://127.0.0.1:4175';
const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { cwd: project, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk; });
server.stderr.on('data', (chunk) => { serverOutput += chunk; });
let browser;

try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { ready = (await fetch(url)).ok; } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Vite did not start. ' + serverOutput);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await page.clock.install();
  async function capture(name) {
    await page.evaluate(() => document.fonts.ready);
    const modalOpen = await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').count() > 0;
    await page.screenshot({ path: path.join(output, `prototype_screen${name}.png`), fullPage: !modalOpen, animations: 'disabled' });
  }
  await page.goto(url);
  await page.getByRole('button', { name: `Play ${decks[0].title}`, exact: true }).waitFor();
  await capture('1');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Game name', { exact: true }).fill('The art of tea');
  await page.getByLabel('Category', { exact: false }).fill('Food & drink');
  await page.getByLabel('Description', { exact: false }).fill('A little pause. A little curiosity.');
  await page.getByLabel('Cover emoji', { exact: false }).fill('🍵');
  await page.getByLabel('Game name', { exact: true }).focus();
  await capture('_new_game');
  await page.getByLabel('Question', { exact: true }).fill('Which plant is used to make green tea?');
  for (const [i, answer] of ['Camellia sinensis', 'Mint', 'Coffee', 'Chamomile'].entries()) {
    await page.getByLabel(`Question 1, option ${'ABCD'[i]}`, { exact: true }).fill(answer);
  }
  await page.getByLabel('Explanation', { exact: false }).fill('Green and black tea come from the same plant.');
  await page.getByRole('button', { name: 'Save game', exact: true }).scrollIntoViewIfNeeded();
  await capture('_editor_questions');
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await capture('_success');
  await page.getByRole('button', { name: `Play ${decks[0].title}`, exact: true }).click();
  await capture('_game');
  for (let i = 0; i < decks[0].questions.length; i++) {
    await page.getByRole('dialog').getByRole('button', { name: decks[0].questions[i].options[decks[0].questions[i].correct], exact: true }).click();
    if (i === 0) await capture('_answer');
    await page.getByRole('button', { name: i === decks[0].questions.length - 1 ? 'To the result' : 'Next question', exact: true }).click();
  }
  await capture('_result');
  await page.getByRole('button', { name: 'Play again', exact: true }).click();
  await page.clock.fastForward(16000);
  await page.getByText('Time’s up!', { exact: true }).waitFor();
  await capture('_timeout');
  await page.getByRole('button', { name: 'All games', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.clock.resume();
  await page.getByRole('button', { name: `Delete ${decks[0].title}`, exact: true }).click();
  await capture('_delete');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Game name', { exact: true }).fill('A quiz without questions');
  await page.getByRole('button', { name: 'Remove question 1', exact: true }).click();
  await page.getByRole('button', { name: 'Save game', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Add a quiz name' }).waitFor();
  await capture('_validation');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await page.getByRole('button', { name: `Play ${decks[0].title}`, exact: true }).waitFor();
  await capture('_mobile');
  await page.getByRole('button', { name: `Play ${decks[0].title}`, exact: true }).click();
  await capture('_mobile_game');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 1000 });
  let release;
  const loading = new Promise((resolve) => { release = resolve; });
  await page.route('**/data/decks.json', async (route) => { await loading; await route.fulfill({ json: decks }); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Getting your quizzes ready…', { exact: true }).waitFor();
  await capture('_loading');
  release();
  await page.getByRole('button', { name: `Play ${decks[0].title}`, exact: true }).waitFor();
  await page.unroute('**/data/decks.json');
  await page.route('**/data/decks.json', (route) => route.fulfill({ json: [] }));
  await page.reload();
  await page.getByText('A little curiosity starts here.', { exact: true }).waitFor();
  await capture('_empty');
  await page.unroute('**/data/decks.json');
  await page.route('**/data/decks.json', (route) => route.fulfill({ status: 503 }));
  await page.reload();
  await page.getByText('Could not load quizzes', { exact: true }).waitFor();
  await capture('_error');
  console.log('Exported 15 prototype screens to practices/practice_08/prototype_screenshots/.');
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    if (process.platform === 'win32') server.kill();
    else process.kill(-server.pid, 'SIGTERM');
  }
}
