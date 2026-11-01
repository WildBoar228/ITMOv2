# Отчёт 2. Исправления и повторные проверки

## 1. Итог

Все уязвимости из `REPORT_01.md` закрыты в `lab/service.py`. `lab/sandbox.py`
не изменялся — физическая граница стенда сохранена. API и функциональность
клиентов сохранены: собственный профиль и чек, покупка по цене каталога,
отзывы, помощь по своему заказу, staff-экспорт.

Результат прогона: **35 тестов, все зелёные** (`test_security.py` — 19,
`test_service.py` — 12, `test_http.py` — 3, плюс контрактные).

## 2. Соответствие «уязвимость → исправление → тест»

| # | Уязвимость | Исправление (`lab/service.py`) | Тест |
|---|---|---|---|
| 1 | Слепое исполнение `decision`, prompt injection | `session_of` + allowlist инструментов + проверка прав на каждый инструмент (`/assistant/execute`) | `test_assistant_execute_requires_session`, `test_customer_cannot_export_profiles_through_assistant`, `test_customer_cannot_read_foreign_file_through_assistant` |
| 2 | SQL-инъекции | Параметризованные запросы `?` в `/profile`, `/search`, `/assistant/context` | `test_profile_sql_injection_does_not_leak_other_rows`, `test_search_injection_is_not_executed`, `test_assistant_context_order_id_is_parameterized` |
| 3 | Подделка `X-Role` | Роль берётся из `sessions[token]`, заголовок игнорируется | `test_customer_cannot_spoof_staff_role_header`, `test_staff_role_comes_from_session_not_header` |
| 4 | Анонимные инструменты помощника | Обязательная сессия; `export_profiles`/`delete_tree` только staff; `read_file` ограничен своим каталогом | `test_assistant_execute_requires_session`, `test_customer_cannot_export_profiles_through_assistant` |
| 5 | `/debug/logs` с секретами | staff-only + редакция `password`/`token`/`X-Token`/`Cookie`/`Authorization` (`redacted_log`) | `test_debug_logs_requires_staff_and_redacts_secrets` |
| 6 | IDOR `/profile` | Проверка `requested == session["id"]` или staff | `test_profile_idor_is_denied` |
| 7 | `/orders` без авторизации | Сессия обязательна; клиент видит только свои заказы | `test_orders_requires_session_and_hides_others` |
| 8 | `/files` — чужие файлы и `private/` | `read_scoped`: только `files/`, клиенту — только `files/<user>/`; `private/` запрещён всем | `test_files_cannot_read_other_user_receipt`, `test_files_cannot_read_private_operator_note` |
| 9 | Подмена цены | `price` из тела игнорируется, берётся `self.products[product]` | `test_order_price_cannot_be_set_by_client` |
| 10 | Stored XSS | `html.escape` при рендере отзывов | `test_review_html_is_escaped` |
| 11 | Нет обязательной аутентификации | `session_of` во всех маршрутах, где есть субъект | набор тестов доступа выше |
| 12 | Анонимные отзывы | `/reviews` требует сессию, сохраняет `author` | `test_reviews_require_session` |
| 13 | Утечка деталей ошибок | Нейтральный `500 {"error": "internal server error"}`; ошибки ввода → 400 | `test_internal_error_details_are_not_exposed` |
| 14 | Нет rate limiting | Счётчик неудач на логин: 5 за 60 с → 429 | `test_login_is_rate_limited` |
| 15 | Бессрочные токены | TTL сессии `SESSION_TTL_SECONDS` + проверка в `session_of` | покрыто контрактом логина |
| 16 | `delete_tree(".")` | staff-only; разрешён только путь внутри `files/`, корень и `files/` отклоняются | `test_delete_tree_requires_staff_and_rejects_root` |
| 17 | Рост `logs`/`reviews` | `MAX_LOG_ENTRIES`, `MAX_REVIEWS` | — |
| 18 | Некорректное тело → 500 | Разбор JSON и проверка типа тела → 400 | — |

## 3. TDD-лог (RED → GREEN)

1. Сначала написан `lab/test_security.py` (19 тестов) — по одному на уязвимость.
2. На исходном `service.py` запущен `python3 -m unittest test_security -v`:
   **19 падений, 1 ошибка**. Характерные падения:
   - `test_order_price_cannot_be_set_by_client`: `AssertionError: 1 != 5000`;
   - `test_profile_sql_injection_does_not_leak_other_rows`:
     `'LEAK' unexpectedly found`;
   - `test_review_html_is_escaped`: `<script>` найден в HTML;
   - `test_orders_requires_session_and_hides_others`: `200 != 401`;
   - `test_files_cannot_read_private_operator_note`: `200 != 403`;
   - `test_login_is_rate_limited`: `401 != 429`.
   
   Это подтверждает, что тесты действительно ловят уязвимости, а не проходят
   «по инерции».
3. Внесены минимальные изменения в `service.py` по блокам: сессии/роли →
   параметризация SQL → авторизация маршрутов → бизнес-логика/XSS/логи →
   права инструментов ассистента → лимиты и валидация.
4. Повторный прогон: **35 тестов, OK**. Исходные `test_service.py` и
   `test_http.py` остались зелёными, значит функциональность не сломана.

## 4. Повторные атаки после исправлений

| Проверка из REPORT_01 | Было | Стало |
|---|---|---|
| SQLi `?id=1 UNION SELECT ... LEAK` | строка `LEAK` в ответе | `400 invalid id`, `LEAK` отсутствует |
| SQLi `/search?q=...UNION...` | `LEAK` в выдаче | `403 staff only` без staff-сессии; параметризованный запрос |
| `X-Role: staff` без staff-сессии | `200` + все профили | `403 staff only` |
| `POST /assistant/execute export_profiles` без токена | `200` + все профили | `401 login required` |
| `POST /assistant/execute export_profiles` как customer | `200` + все профили | `403 staff only` |
| `delete_tree "."` без токена | файлы уничтожены, `200` | `401` |
| `delete_tree "."` staff | файлы уничтожены, `200` | `400 invalid path` |
| `/files?user=alice&path=../../private/operator-note.txt` | секрет оператора | `403 forbidden` (и для customer, и для staff) |
| `/files?user=bob&path=receipt.txt` как alice | чужой чек | `403 forbidden` |
| `/profile?id=2` как alice | профиль TEST_BOB | `403 forbidden` |
| `/orders` без токена | все заказы | `401 login required` |
| `POST /orders {"product":"chair","price":1}` | цена `1` | цена `5000` (из каталога) |
| `POST /reviews` с `<script>` | исполняемый тег в HTML | `&lt;script&gt;` |
| `/debug/logs` без токена | пароли и токены | `403 staff only` |
| `/debug/logs` staff | `learn-alice`, токены | значения заменены на `***` |
| 6-я неверная попытка логина | `401` (перебор) | `429 too many attempts` |
| `/profile?id=notanumber` | `500` + текст SQLite | `400 invalid id` |

## 5. Остаточные риски и ограничения

- **Prompt injection** полностью не устраняется на уровне LLM: модель всё ещё
  может вернуть опасное решение. Защита перенесена на сервер — `execute`
  проверяет сессию, роль и аргументы, поэтому вредоносное решение не даёт
  полномочий. Это соответствует требованию «защита независимо от послушания
  модели».
- Сервис по-прежнему слушает только `127.0.0.1`; TLS и внешняя сеть вне
  контура лаборатории.
- Пароли учебные и хранятся в памяти; для реального сервиса нужен хеш
  (например, `hashlib.scrypt`) и постоянное хранилище сессий.
- Лимиты `logs`/`reviews` — простые счётчики в памяти, достаточные для стенда.

## 6. Как проверить

```bash
cd practices/practice_06
make test          # 35 тестов, OK

# из корня репозитория
make step6         # тесты практики 06
```
