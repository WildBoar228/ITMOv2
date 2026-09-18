# Журнал экспериментов Практики 2

- Выбранный слабый артефакт Практики 1: [tests_load.md](../practice_01/tests_load.md)
- Что в нём нужно улучшить:
  - Пороги задержки не соответствуют правилам из CASE.md
  - Описать воспроизводимое окружение и метрики/артефакты Evidence
  - добавить отказные сценарии под нагрузкой для API-1 (413) и 422.
- Как поймём, что изменение полезно: изменение улучшает соответствие правилам из [context.md](../practice_01/context.md)

| Техника | Файл эксперимента | Изменённый файл Практики 1 | Конкретное изменение | Проверка | Что отклонили |
|---|---|---|---|---|---|
| Few-shot | [`few_shot/experiment.md`](few_shot/experiment.md) | [`few_shot/tests_load.md`](few_shot/tests_load.md) | Добавлены Environment и Metrics & Evidence, сценарии Error storm и Validation under load; убраны произвольные пороги | Привязка pass/fail к CASE (REL-1/OUT-1/API-1); наличие Evidence-артефактов | Произвольные SLO по задержке; нагрузка на реальный LLM |
| R.C.T.F. | [`rctf/experiment.md`](rctf/experiment.md) | [`rctf/tests_load.md`](rctf/tests_load.md) | Минимальные дифф-правки: новые разделы и сценарии, связь pass/fail с CASE | Сравнение с CASE и интеграционными/E2E артефактами | Новые требования сверх CASE |
| Chain of Verification | [`chain_of_verification/experiment.md`](chain_of_verification/experiment.md) | [`chain_of_verification/tests_load.md`](chain_of_verification/tests_load.md) | Устранены нарушения: добавлен error storm, валидация под нагрузкой, окружение/метрики | Вопросы проверки подтверждены; Evidence-артефакты перечислены | Произвольные пороги задержек |
| Tree of Thoughts | [`tree_of_thoughts/experiment.md`](tree_of_thoughts/experiment.md) | [`tree_of_thoughts/tests_load.md`](tree_of_thoughts/tests_load.md) | Выбрана табличная структура; добавлены разделы и сценарии, убраны KPI | Соответствие CASE; воспроизводимость для CI | Сложные SLO и секционная структура по каждому правилу |
| RAG | [`rag/experiment.md`](rag/experiment.md) | [`rag/tests_load.md`](rag/tests_load.md) | Правки на основе источников: разделы, сценарии, связь с CASE | Ссылки на CASE/tests_integration/tests_e2e/analysis | Неподтверждённые SLO; логгирование diff |
| ReAct | [`react/experiment.md`](react/experiment.md) | [`react/tests_load.md`](react/tests_load.md) | Пошагово добавлены разделы, сценарии; убраны произвольные пороги | Проверка по шагам, подтверждение артефактов Evidence | Придумывание новых требований, реальные LLM-тесты |

## Независимое ревью

| Замечание другой команды | Где исправили | Evidence |
|---|---|---|
| Двусмысленность |  |  |
| Непроверяемое требование |  |  |
| Пропущенный риск или источник |  |  |
