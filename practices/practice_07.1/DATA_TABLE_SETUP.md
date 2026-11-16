# Data Table для результатов ревью

В `workflow_hw.json` добавлено сохранение проверенных PR в таблицу
`ai_reviewed_prs` и проверка перед запуском обеих моделей (пункты 2–3
домашнего задания).

## Создание таблицы в n8n

1. Откройте проект n8n, в котором находится workflow.
2. На вкладке **Data tables** создайте таблицу **`ai_reviewed_prs`**.
3. Добавьте пользовательские колонки с точными именами и типами:

   | Колонка | Тип | Пример |
   | --- | --- | --- |
   | `pr_id` | String | `WildBoar228/ITMOv2#42` |
   | `repository` | String | `WildBoar228/ITMOv2` |
   | `pr_number` | Number | `42` |
   | `model` | String | `openai/gpt-5.5` |
   | `review_url` | String | Ссылка на опубликованное GitHub review |

   Системные колонки `id`, `createdAt` и `updatedAt` n8n создаёт сам.
   `id` — идентификатор строки таблицы, а `pr_id` — ключ проверенного PR.

4. Импортируйте обновлённый `workflow_hw.json`.
5. Откройте ноды **Store Main AI Review**, **Store Other AI Review**,
   **Only Unreviewed PRs** и **Only Unreviewed Other PRs**. Во всех выбрана
   таблица по имени
   **Data table → By Name → ai_reviewed_prs**.
   В нодах сохранения настроены **Row → Insert** и ручное сопоставление
   колонок. В **Only Unreviewed PRs** выбрана операция
   **If Row Does Not Exist** с условием `pr_id` **Equals** `{{ $json.pr_id }}`.
   В **Only Unreviewed Other PRs** используется та же операция с условием
   `pr_id` **Equals**
   `{{ $json.body.repository.full_name + '#' + $json.body.issue.number }}`.
   Если ваша версия n8n не поддерживает выбор таблицы по имени, выберите
   созданную таблицу через **From list** во всех четырёх нодах.
6. Проверьте сопоставление колонок и доступность credentials GitHub и моделей,
   затем сохраните и активируйте workflow.

Таблица создаётся отдельно: экспорт workflow содержит настройки нод,
но не создаёт саму Data Table в другом экземпляре n8n.

## Что сохраняет workflow

Основная ветка:

```text
GitHub Robot1 → Store Main AI Review → Add Label to PR1
```

Ветка команды `/make_other_ai_review`:

```text
GitHub Robot → Store Other AI Review → Add Label to PR
```

Строка записывается после успешной публикации review в GitHub и до установки
метки. Если публикация завершится ошибкой, запись о выполненном ревью не появится.
Если установка метки завершится ошибкой, опубликованное ревью уже будет учтено.

`pr_id` — составной идентификатор `owner/repository#number`, а не числовой
GitHub database ID. Он одинаков для двух веток и различает PR с одинаковыми
номерами в разных репозиториях. Для событий `pull_request` номер берётся из
`body.number`, а для `issue_comment` — из `body.issue.number`. Нода
**Prepare Main PR** приводит оба события к общей структуре `pr_id`,
`repository`, `pr_number`. Основная ветка использует эту структуру для
получения diff, публикации review, сохранения строки и установки метки.

`review_url` берётся из ответа ноды публикации review (`html_url`).
При смене модели обновите также значение колонки `model` в соответствующей
ноде сохранения.

## Как исключаются повторные запуски

При открытии PR:

```text
PR Trigger1 → Is PR Opened [true] → Prepare Main PR
```

При новом комментарии `/make_ai_review`:

```text
PR Comment Trigger → If [false] → Is Main Review Command [true]
    → Prepare Main PR
```

Нода **If** распознаёт `/make_other_ai_review` и направляет эту команду на
проверку перед второй моделью. **Is Main Review Command** пропускает только новый комментарий
`/make_ai_review` в PR: обычные issues, редактирования, удаления комментариев
и любой другой текст заканчивают выполнение на фильтре.

Далее оба входа основной ветки проходят одну проверку:

```text
Prepare Main PR → Only Unreviewed PRs → Get file's PR info
    → Code Review Agent1 → GitHub Robot1 → Store Main AI Review
    → Add Label to PR1
```

**Only Unreviewed PRs** ищет строку с тем же `pr_id` в `ai_reviewed_prs`.
Если строка уже есть, нода возвращает **0 items** и основная ветка
завершается до получения diff и вызова модели. Если строки нет, нода
пропускает исходные данные дальше без изменений.

Ветка `/make_other_ai_review` проходит аналогичную проверку:

```text
PR Comment Trigger → If [true] → Only Unreviewed Other PRs
    → Get file's Other PR info → Code Review Agent → GitHub Robot
    → Store Other AI Review → Add Label to PR
```

**Only Unreviewed Other PRs** вычисляет такой же ключ `owner/repository#number`
из исходного webhook. Если ключ уже есть в таблице, нода возвращает **0 items**:
получение diff, вторая модель и публикация review не запускаются.

Обе проверки ищут только `pr_id`, независимо от модели: любое уже сохранённое
ревью этого PR блокирует обе команды. Например, после автоматического ревью
при открытии PR команда `/make_other_ai_review` тоже будет пропущена.

В настройках **Only Unreviewed PRs** и **Only Unreviewed Other PRs**
оставьте **Always Output Data** выключенным:
иначе n8n передаст пустой item дальше даже для уже проверенного PR.

**Is PR Opened** разрешает автоматический запуск только при `action = opened`.
Изменение меток, обновление коммитов и другие события PR останавливаются
на этом фильтре.

## Проверка и подтверждение для сдачи

1. Выберите тестовый PR, которого ещё нет в таблице (например, открытый до
   активации workflow), и отправьте `/make_other_ai_review` отдельным новым
   комментарием на вкладке **Conversation**.
2. Убедитесь, что review опубликовано в PR, а в **Executions** успешно
   выполнена нода **Store Other AI Review**.
3. Откройте **Data tables → ai_reviewed_prs**: должна появиться строка
   с ключом и номером этого PR, второй моделью и ссылкой на review.
4. Для проверки основной ветки откройте тестовый PR и проверьте запись
   от **Store Main AI Review**.
5. Приложите скриншоты выполнения и содержимого таблицы, ссылку на PR
   и экспорт workflow из вашего n8n с выбранной таблицей.

### Проверка пункта 3

1. Выберите PR, для которого в `ai_reviewed_prs` уже есть строка.
2. Отправьте новый комментарий `/make_ai_review`.
3. В **Executions** откройте запуск: команда должна пройти
   **Is Main Review Command**, а **Only Unreviewed PRs** — вернуть **0 items**.
   Ноды получения diff, модели и публикации review не должны выполняться.
4. Убедитесь, что в PR не появилось новое review, а в таблице — новая строка.
5. Для проверки первого запуска команды используйте существующий PR без строки
   в таблице (например, открытый до активации workflow). Отправьте
   `/make_ai_review`: должно появиться review и строка в таблице. Отправьте
   команду ещё раз: повторный запуск должен остановиться на проверке таблицы.
6. Сохраните скриншот **Executions** с результатом проверки и содержимого
   таблицы для того же PR.

### Проверка повторного вызова второй модели

1. Для PR без записи в таблице отправьте `/make_other_ai_review` и дождитесь
   публикации review и выполнения **Store Other AI Review**.
2. Отправьте новый комментарий `/make_other_ai_review` в тот же PR.
3. В **Executions** нода **Only Unreviewed Other PRs** должна вернуть **0 items**.
   Получение diff, **Code Review Agent** и **GitHub Robot** не должны выполняться.
4. Убедитесь, что число review в PR и строк в таблице не увеличилось.
5. Для PR с уже сохранённым ревью основной моделью эта команда также должна
   завершиться на **Only Unreviewed Other PRs**.
