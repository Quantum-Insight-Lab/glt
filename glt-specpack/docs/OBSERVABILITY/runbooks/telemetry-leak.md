---
id: glt.doc.observability.runbook.telemetry-leak
owner: reliability
normativity: informative
status: accepted
depends_on:
  - glt.doc.observability.runbooks-index
source_refs: []
---

# telemetry-leak

**Инвариант:** sheet INV-11 (телеметрия очищается до экспорта), PROTO-18.
**Метрика:** `glt_dlp_canary_leak_total` = 0.

Canary `glt-dlp-canary` или сырой PII оказались в экспортируемом документе.
Это утечка на границе коллектора, не «шум атрибутов».

## Detect

- `glt_dlp_canary_leak_total` > 0.
- Canary-тест в CI падает, если токен остаётся в `exportOtel` / `exportAuditChain`.
- В traces есть email, prompt, user id или секрет.

## Mitigate

1. **Остановить экспорт.** Документ с сырым PII не уходит в collector.
2. **Скруб до возврата.** Allowlist из `privacy.md`. Поле с canary дропается.
3. **Не логировать содержимое утечки.** Алерт несёт имя поля и метрику, не payload.
4. **Повторить canary.** Пока токен виден на выходе, экспорт закрыт.

## Escalate

Повторная утечка — дефект allowlist или обход `scrubTelemetry`. Control plane
не подтверждает чистоту собственной телеметрии самоотчётом: нужен canary в CI.

## Postmortem

- Какое поле пропустил allowlist.
- Почему скруб сработал после, а не до экспорта.
- Нужно ли сузить схему, а не расширять её.
