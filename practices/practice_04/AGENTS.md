# Quiz-карточки — правила для агента

Проект: локальная веб-страница «Kahoot на одного» в `project/`. Без сборки, без зависимостей.

## Структура

- `project/index.html` — 4 экрана: список / редактор / игра / результат
- `project/style.css` — тёмная тема, классы `.deck-card`, `.opt-btn`, `.timer`
- `project/app.js` — вся логика, vanilla JS, константа `TIME_PER_QUESTION = 15`
- `project/data/decks.json` — массив игр: `{id, title, questions: [{id, q, options[4], correct}]}`

## Схема decks.json (строгая)

- Вопросов ≥ 1, вариантов ровно 4, `correct` — индекс 0–3
- Весь текст trim, пустые строки запрещены
- Пример валидной игры — `demo-it` в `data/decks.json`

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

## MCP

- Подключён `context7` (remote, см. корневой `opencode.json`): свежие доки и примеры кода.
- Когда нужен внешний API или синтаксис (fetch, таймеры, a11y, CSS) — вызывай `context7` tools (`resolve-library-id` → `get-library-docs`), а не выдумывай по памяти.
