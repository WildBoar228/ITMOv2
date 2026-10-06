# Quiz-карточки — правила для агента

Проект: локальная веб-страница «Kahoot на одного» в `project/`. Без сборки, без зависимостей.

## Структура

- `project/index.html` — 4 экрана: список / редактор / игра / результат
- `project/style.css` — тёмная тема, классы `.deck-card`, `.opt-btn`, `.timer`
- `project/app.js` — вся логика, vanilla JS, константа `TIME_PER_QUESTION = 15`
- `project/data/decks.json` — массив игр: `{id, title, questions: [{id, q, options[4], correct, explain?}]}`

## Схема decks.json (строгая)

- Вопросов ≥ 1, вариантов ровно 4, `correct` — индекс 0–3
- `explain` опционален: если есть — строка (пустая = как нет); показывается после ответа
- Весь текст trim, пустые строки запрещены
- Пример валидной игры — `demo-it` в `data/decks.json`

## Фича B — правка / удаление игр (реализована)

- Карточка списка (`renderList()` в `app.js`): рядом с «Играть» лежит
  `.card-actions` с двумя кнопками — `✎` (`.edit-btn` → `startEdit(id)`)
  и `🗑` (`.delete-btn` → `deleteDeck(id)`). У кнопок есть `title` и `aria-label`.
- Режим правки: `state.editingId` (`null` = новая игра). `startEdit(id)`
  загружает deck в редактор, ставит `#editor-title` = «Редактирование»;
  `openNewEditor()` сбрасывает `editingId`, ставит «Новая игра».
  Заголовок редактора в `index.html` обязан иметь `id="editor-title"`.
- Сохранение (`save-deck`): при `editingId` — замена по `findIndex` с
  сохранением `id` (`{...deck, id: editingId}`), затем сброс `editingId`;
  без `editingId` — `push` нового. Если deck успел исчезнуть (`idx < 0`) — `push`.
- Удаление: только через нативный `confirm(«Удалить игру ...»)`; отмена = ничего.
  Текущий забег игры не трогаем (удаление колоды «под ногами» у играющего — ок).
- Всё в памяти, персист — только существующий экспорт. `localStorage` запрещён.
- Стили кнопок — только `style.css` (`.card-actions`, `.icon-btn`).
- Тесты: `tests/test_feature_b.py` (4 шт., стат-проверки исходника по образцу
  `test_decks.py`). Схему и таймер не трогает.

## Правила правок

1. Не меняй схему без обновления `validateDeck()` в `app.js` и `tests/test_decks.py`
2. Radio правильного ответа в редакторе: один `name` на вопрос (баг с разными `name` уже чинили — не возвращать)
3. Таймер фиксирован: 15 с, тик 200 мс. Не добавлять настройки времени без задачи
4. Прогресс не сохраняем: никакого `localStorage` для счёта, только память. Импорт/экспорт JSON через кнопки — не ломать
5. Стиль: править только `style.css`, инлайн-стилей в JS минимум (только `timer-bar.width`)

## Команды

```bash
python3 -m http.server 8000            # запуск, страница: /project/
python3 -m json.tool project/data/decks.json  # валидация данных
node --check project/app.js            # синтаксис JS
pytest -q                              # схема decks.json (после добавления tests/)
```

После любой правки `app.js` или `decks.json` запускай проверку и показывай результат пользователю.
Проверка также запускается автоматически hook `.opencode/plugins/quiz-check.js` после правок в `project/` (runner `tests/check.sh`).

## Skill

- Подключён `test-driven-development` (`.opencode/skills/test-driven-development/SKILL.md`).
- Перед любой фичей/фиксом в `project/app.js`: сначала падающий тест, показать его провал, затем минимальный код, затем полный прогон проверок из раздела «Команды».
- Без зафиксированного красного теста production-код не писать.
- Свой скилл `quiz-generator` (`.opencode/skills/quiz-generator/`): генерация игры
  из учебного текста строго по схеме (`template.md` + самопроверка до выдачи).

## MCP

- Подключён `context7` (remote, см. корневой `opencode.json`): свежие доки и примеры кода.
- Когда нужен внешний API или синтаксис (fetch, таймеры, a11y, CSS) — вызывай `context7` tools (`resolve-library-id` → `get-library-docs`), а не выдумывай по памяти.
