---
id: glt.dev.21
owner: engineering
normativity: normative
status: planned
wave: 3
depends_on:
  - glt.dev.20
spec_refs:
  - ../SPEC/api.md
  - ../SPEC/cli.md
  - ../SPEC/architecture.md
  - ../SPEC/structural-invariants.md
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/api.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
---

# 21 — API-сервис

**Волна:** 3 · **Риск:** средний · **Gate:** нет

## Что делаем

- HTTP API контрол-плейна: Fastify, только чтение
- Тело ответа = JSON-артефакт CLI, те же схемы. Версии входов — заголовки, не конверт
- Команды `glt` не расширяются. В копию никто не пишет

## Почему API именно здесь

До DEV-21 единственный вход — CLI. Дашборд уже есть, но запросы действий
через него ждут API (S-5). Persistence, RBAC и Event Core — следующие шаги
волны 3; этот шаг открывает вход, не хранилище и не шину событий.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым.

### По шагу

- [x] API отдаёт те же артефакты, что CLI, и валидирует их теми же схемами
- [x] Ни один эндпоинт не пишет в рабочую копию
- [x] Ответ несёт версии входов: `snapshot_id`, `registry_version`, digests

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [api.md](../SPEC/api.md)
- [cli.md](../SPEC/cli.md)
- [architecture.md](../SPEC/architecture.md)

## Статус

в дереве — ветка `wave3`. Fastify, GET-only. GitHub CI ещё не принимал шаг.
