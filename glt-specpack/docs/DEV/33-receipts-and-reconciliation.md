---
id: glt.dev.33
owner: engineering
normativity: normative
status: planned
wave: 4
depends_on:
  - glt.dev.32
spec_refs:
  - ../SPEC/audit.md
  - ../SPEC/runner.md
  - ../SPEC/architecture.md
  - ../SPEC/events.md
  - ../SPEC/cli.md
  - ../SPEC/degradation.md
  - ../SPEC/structural-invariants.md
  - ../OBSERVABILITY/runbooks/runner-unknown-outcome.md
  - ../PDA/04-invariants.md
risk: high
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/audit.md
    authority: audit-chain
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/runner.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/events.md
    authority: event-registry
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/degradation.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/OBSERVABILITY/runbooks/runner-unknown-outcome.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 33 — Receipts и reconciliation

**Волна:** 4 · **Риск:** высокий · **Gate:** нет

## Что делаем

- Обработка `unknown_outcome`

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [ ] Попытка записывается **до** эффекта (PROTO-16)
- [ ] Потеря связи после внешней записи даёт `unknown_outcome`, а не автоматический retry
- [ ] Исход устанавливается сверкой с целевой системой и пишется новой audit-записью
- [ ] `unknown_outcome` допустим как конечное состояние и не выдаётся за успех

### Общее

- [ ] CI зелёный на всех шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [audit.md](../SPEC/audit.md)

`recordAttempt` — write-ahead до эффекта (PROTO-16). Потеря связи без
receipt — `unknown_outcome`, `denyBlindRetry`. `reconcileOutcome` ставит
succeeded/failed только по наблюдению цели с тем же attempt key; иначе
состояние остаётся `unknown_outcome` и не считается успехом. Новая
audit-запись, старая не переписывается (INV-07). События уже в реестре.
`registry/` и схемы не правятся. Команды `glt` не добавляются.

## Статус

запланирован
