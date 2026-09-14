---
id: glt.dev.22
owner: engineering
normativity: normative
status: planned
wave: 3
depends_on:
  - glt.dev.21
spec_refs:
  - ../SPEC/snapshots.md
  - ../SPEC/audit.md
  - ../SPEC/architecture.md
  - ../SPEC/api.md
  - ../SPEC/structural-invariants.md
  - ../../parameters/audit-retention.yaml
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/snapshots.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/audit.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/api.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/parameters/audit-retention.yaml
    authority: parameter-values
    role: derived-from
---

# 22 — Хранилище PostgreSQL

**Волна:** 3 · **Риск:** средний · **Gate:** нет

## Что делаем

- Хранение снимков и audit-записей в PostgreSQL JSONB
- Снимок неизменяем после записи. Audit — только append. Команды `glt` не расширяются

## Почему store именно здесь

API (DEV-21) компилирует на лету и в копию не пишет. Persistence — отдельный
механизм: не файл в `snapshots/`, не второй digest, не событие. Compose
(DEV-25) подключит процесс к серверу; этот шаг закрепляет схему и инварианты.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым.

### По шагу

- [x] Снимок неизменяем после записи
- [x] Digest, посчитанный после чтения из БД, совпадает с записанным (PROTO-03)
- [x] Audit-таблица работает как append-only, удаление невозможно

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [snapshots.md](../SPEC/snapshots.md)
- [audit.md](../SPEC/audit.md)

## Статус

в дереве — ветка `wave3`. JSONB store. GitHub CI ещё не принимал шаг.
