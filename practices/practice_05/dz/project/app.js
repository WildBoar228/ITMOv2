// Baseline: фиксированно 15 сек на вопрос, 4 варианта, без сохранения прогресса.
const TIME_PER_QUESTION = 15;

const state = {
  decks: [],
  current: null, // { deck, index, score, correctCount, locked, timerId, timeLeft }
  editingId: null, // id колоды в режиме правки, иначе null
};

const $ = (id) => document.getElementById(id);

function showScreen(name) {
  for (const s of ["list", "editor", "play", "result"]) {
    $("screen-" + s).classList.toggle("hidden", s !== name);
  }
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.nav === name || (name === "play" && b.dataset.nav === "list") || (name === "result" && b.dataset.nav === "list"));
  });
}

// ---------- Загрузка ----------
async function loadDecks() {
  try {
    const res = await fetch("data/decks.json");
    if (!res.ok) throw new Error("http " + res.status);
    const data = await res.json();
    state.decks = data.filter(validateDeck);
  } catch (e) {
    console.warn("Не удалось загрузить data/decks.json:", e);
    state.decks = [];
  }
  renderList();
}

function validateDeck(d) {
  if (!d || typeof d.title !== "string" || !Array.isArray(d.questions)) return false;
  return d.questions.every(
    (q) =>
      typeof q.q === "string" &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      Number.isInteger(q.correct) &&
      q.correct >= 0 &&
      q.correct < 4 &&
      (!("explain" in q) || typeof q.explain === "string")
  );
}

// ---------- Список ----------
function renderList() {
  const box = $("deck-list");
  box.innerHTML = "";
  if (state.decks.length === 0) {
    box.innerHTML = "<p class='muted'>Пока нет игр. Создай первую через «+ Новая игра».</p>";
    return;
  }
  state.decks.forEach((deck) => {
    const card = document.createElement("div");
    card.className = "deck-card";
    card.innerHTML = `<h3></h3><div class="muted">${deck.questions.length} вопр. · ⏱ ${TIME_PER_QUESTION}с</div>`;
    card.querySelector("h3").textContent = deck.title;
    const btn = document.createElement("button");
    btn.className = "btn primary";
    btn.textContent = "Играть";
    btn.onclick = () => startGame(deck.id);
    card.appendChild(btn);
    const actions = document.createElement("div");
    actions.className = "card-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn ghost icon-btn edit-btn";
    editBtn.textContent = "✎";
    editBtn.title = "Редактировать";
    editBtn.setAttribute("aria-label", `Редактировать «${deck.title}»`);
    editBtn.onclick = () => startEdit(deck.id);
    const delBtn = document.createElement("button");
    delBtn.className = "btn ghost icon-btn delete-btn";
    delBtn.textContent = "🗑";
    delBtn.title = "Удалить";
    delBtn.setAttribute("aria-label", `Удалить «${deck.title}»`);
    delBtn.onclick = () => deleteDeck(deck.id);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);
    box.appendChild(card);
  });
}

function deleteDeck(deckId) {
  const deck = state.decks.find((d) => d.id === deckId);
  if (!deck) return;
  if (!confirm(`Удалить игру «${deck.title}»?`)) return;
  state.decks = state.decks.filter((d) => d.id !== deckId);
  renderList();
}

function openNewEditor() {
  state.editingId = null;
  $("editor-title").textContent = "Новая игра";
  $("editor-questions").innerHTML = "";
  $("editor-questions").appendChild(editorQuestionBlock());
  $("game-title").value = "";
  $("editor-error").textContent = "";
  showScreen("editor");
}

function startEdit(deckId) {
  const deck = state.decks.find((d) => d.id === deckId);
  if (!deck) return;
  state.editingId = deckId;
  $("editor-title").textContent = "Редактирование";
  $("game-title").value = deck.title;
  $("editor-error").textContent = "";
  $("editor-questions").innerHTML = "";
  deck.questions.forEach((q) => $("editor-questions").appendChild(editorQuestionBlock(q)));
  showScreen("editor");
}

// ---------- Редактор ----------
function editorQuestionBlock(value = { q: "", options: ["", "", "", ""], correct: 0 }) {
  const div = document.createElement("div");
  div.className = "q-card";
  div.innerHTML = `
    <div class="q-head">
      <input type="text" class="eq-text" placeholder="Текст вопроса" maxlength="200" />
      <button class="btn ghost eq-remove">✕</button>
    </div>
    <div class="opts"></div>
    <input type="text" class="eq-explain" placeholder="Пояснение (необязательно)" maxlength="300" />
  `;
  div.querySelector(".eq-text").value = value.q;
  div.querySelector(".eq-explain").value = value.explain ?? "";
  const opts = div.querySelector(".opts");
  const group = "c-" + Math.random().toString(36).slice(2);
  value.options.forEach((text, i) => {
    const row = document.createElement("label");
    row.className = "q-opt";
    row.innerHTML = `<input type="radio" name="${group}" ${i === value.correct ? "checked" : ""} title="Правильный ответ" />
      <input type="text" placeholder="Вариант ${i + 1}" maxlength="120" />`;
    row.querySelector('input[type="text"]').value = text;
    opts.appendChild(row);
  });
  div.querySelector(".eq-remove").onclick = () => div.remove();
  return div;
}

function collectDeckFromEditor() {
  const title = $("game-title").value.trim();
  const cards = [...$("editor-questions").querySelectorAll(".q-card")];
  if (!title) return { error: "Введи название игры." };
  if (cards.length === 0) return { error: "Добавь хотя бы один вопрос." };
  const questions = [];
  for (let qi = 0; qi < cards.length; qi++) {
    const card = cards[qi];
    const q = card.querySelector(".eq-text").value.trim();
    const optInputs = [...card.querySelectorAll('.q-opt input[type="text"]')];
    const radios = [...card.querySelectorAll('.q-opt input[type="radio"]')];
    const options = optInputs.map((i) => i.value.trim());
    const correct = radios.findIndex((r) => r.checked);
    const explain = card.querySelector(".eq-explain").value.trim();
    if (!q) return { error: `Вопрос ${qi + 1}: пустой текст.` };
    if (options.some((o) => !o)) return { error: `Вопрос ${qi + 1}: заполни все 4 варианта.` };
    if (correct < 0) return { error: `Вопрос ${qi + 1}: выбери правильный ответ.` };
    const item = { id: "q" + (qi + 1), q, options, correct };
    if (explain) item.explain = explain;
    questions.push(item);
  }
  return { deck: { id: "deck-" + Date.now(), title, questions } };
}

// ---------- Игра ----------
function startGame(deckId) {
  const deck = state.decks.find((d) => d.id === deckId);
  if (!deck) return;
  state.current = { deck, index: 0, score: 0, correctCount: 0 };
  showScreen("play");
  $("play-title").textContent = deck.title;
  renderQuestion();
}

function renderQuestion() {
  const cur = state.current;
  const q = cur.deck.questions[cur.index];
  clearInterval(cur.timerId);
  cur.locked = false;
  cur.timeLeft = TIME_PER_QUESTION;

  $("play-progress").textContent = `Вопрос ${cur.index + 1} из ${cur.deck.questions.length}`;
  $("play-score").textContent = cur.score;
  $("play-question").textContent = q.q;
  $("play-feedback").textContent = "";
  $("play-explain").textContent = "";
  $("play-next").classList.add("hidden");

  const box = $("play-options");
  box.innerHTML = "";
  q.options.forEach((text, i) => {
    const b = document.createElement("button");
    b.className = "opt-btn";
    b.textContent = text;
    b.onclick = () => answer(i);
    box.appendChild(b);
  });

  updateTimerBar();
  cur.timerId = setInterval(() => {
    cur.timeLeft -= 0.2;
    if (cur.timeLeft <= 0) {
      cur.timeLeft = 0;
      updateTimerBar();
      answer(-1); // таймаут
      return;
    }
    updateTimerBar();
  }, 200);
}

function updateTimerBar() {
  const cur = state.current;
  $("timer-bar").style.width = (cur.timeLeft / TIME_PER_QUESTION) * 100 + "%";
}

function answer(idx) {
  const cur = state.current;
  if (cur.locked) return;
  cur.locked = true;
  clearInterval(cur.timerId);

  const q = cur.deck.questions[cur.index];
  const buttons = [...$("play-options").children];
  buttons.forEach((b) => (b.disabled = true));
  buttons[q.correct].classList.add("correct");

  if (idx === q.correct) {
    // Бонус за скорость: 10 + оставшиеся секунды
    const gained = 10 + Math.ceil(cur.timeLeft);
    cur.score += gained;
    cur.correctCount += 1;
    $("play-feedback").textContent = `Верно! +${gained}`;
  } else if (idx === -1) {
    $("play-feedback").textContent = "Время вышло!";
  } else {
    buttons[idx].classList.add("wrong");
    $("play-feedback").textContent = "Неверно.";
  }

  $("play-score").textContent = cur.score;
  $("play-explain").textContent = typeof q.explain === "string" ? q.explain : "";
  const last = cur.index === cur.deck.questions.length - 1;
  const next = $("play-next");
  next.textContent = last ? "К результату" : "Далее";
  next.classList.remove("hidden");
  next.onclick = () => {
    if (last) showResult();
    else {
      cur.index += 1;
      renderQuestion();
    }
  };
}

function showResult() {
  const cur = state.current;
  showScreen("result");
  $("result-score").textContent = `${cur.score} очков`;
  $("result-detail").textContent = `Правильно: ${cur.correctCount} из ${cur.deck.questions.length} · «${cur.deck.title}»`;
}

// ---------- События ----------
document.querySelectorAll(".nav-btn").forEach((b) => {
  b.onclick = () => {
    if (b.dataset.nav === "editor") {
      openNewEditor();
    } else {
      showScreen("list");
    }
  };
});

$("add-question").onclick = () => $("editor-questions").appendChild(editorQuestionBlock());

$("save-deck").onclick = () => {
  const { deck, error } = collectDeckFromEditor();
  if (error) {
    $("editor-error").textContent = error;
    return;
  }
  if (state.editingId) {
    const idx = state.decks.findIndex((d) => d.id === state.editingId);
    if (idx >= 0) {
      state.decks[idx] = { ...deck, id: state.editingId };
    } else {
      state.decks.push(deck);
    }
    state.editingId = null;
  } else {
    state.decks.push(deck);
  }
  renderList();
  showScreen("list");
};

$("result-retry").onclick = () => startGame(state.current.deck.id);
$("result-home").onclick = () => showScreen("list");

$("export-all").onclick = () => {
  const blob = new Blob([JSON.stringify(state.decks, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "decks.json";
  a.click();
  URL.revokeObjectURL(a.href);
};

$("import-file").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const arr = Array.isArray(data) ? data : [data];
      const valid = arr.filter(validateDeck);
      if (valid.length === 0) throw new Error("нет валидных игр");
      valid.forEach((d) => {
        if (!d.id) d.id = "deck-" + Date.now() + Math.floor(Math.random() * 1000);
        state.decks.push(d);
      });
      renderList();
    } catch (err) {
      alert("Не удалось импортировать: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
};

loadDecks();
