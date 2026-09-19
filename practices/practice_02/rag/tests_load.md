# Нагрузочные проверки

Сейчас сервис ограничен учебным сценарием и зависит от внешнего LLM; полноценные нагрузочные испытания с реальным LLM нецелесообразны из-за стоимости и лимитов. Условие для проведения: план интеграции в CI/CD и ожидание ≥ 1000 вызовов в день либо подключение к платному LLM с согласованным бюджетом.

__При соблюдении условий выше__, план:

### Environment
- Runner: Linux x86_64; 4 vCPU, 8 GB RAM; веб-сервер: 4 воркера
- Concurrency: X клиентов генератора
- LLM stub: fast-ok / error-storm; таймаут обёртки 10с (REL-1)

### Metrics & Evidence
- Метрики: p50/p95/p99 latency, error rate 4xx/5xx, CPU/RAM
- Evidence: perf_report.json, codes_summary.csv, stub_llm.log, out1_check.log

| Сценарий | Нагрузка и длительность | Критерии pass/fail | Что измеряем | Evidence |
|---|---|---|---|---|
| Stable baseline | 10 RPS, 5 мин, fast-ok | 0 5xx; OUT-1 на успешных; все ответы ≤10с | latency, codes, ресурсы | perf_report.json, codes_summary.csv, out1_check.log |
| Error storm (REL-1) | 50 RPS, 2 мин, error-storm | Все ошибки/таймауты → контролируемые ответы ≤10с и соответствуют OUT-1 | деградация, error rate | perf_report.json, stub_llm.log, out1_check.log |
| Validation under load (API-1/422) | 30 RPS, 3 мин, микс | 100% 413 для diff>20000; 100% 422 при отсутствии diff | codes breakdown | codes_summary.csv |

## Как использовали AI

- Строка в [`prompts.md`](prompts.md): P1-04
- Что проверили и исправили сами: связали pass/fail с CASE; добавили источники и Evidence.
