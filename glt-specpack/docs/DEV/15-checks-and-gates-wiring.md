---
id: glt.dev.15
owner: engineering
normativity: normative
status: planned
wave: 2
depends_on:
  - glt.dev.14
spec_refs:
  - ../SPEC/gates.md
  - ../SPEC/topology.md
  - ../SPEC/invariants.md
  - ../SPEC/cli.md
  - ../SPEC/events.md
  - ../PDA/04-invariants.md
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/gates.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/topology.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/invariants.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/events.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 15 — Связывание checks и gates

**Волна:** 2 · **Риск:** средний · **Gate:** нет

## Что делаем

- Вычислитель состояния gate
- Код в `packages/domain`. Команды `glt gate` нет. `glt health` — DEV-16.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Обязательный или упавший check переводит gate в `pending` или `blocked`
- [x] Gate не проходит при отсутствии сигнала — отсутствие не равно успеху (PROTO-12)
- [x] Каждый переход состояния несёт evidence: закрытый gate, отчёт проверки или явную блокировку
- [x] Gate в v1 только вычисляет и ничего не мерджит

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [gates.md](../SPEC/gates.md)

## Статус

в дереве — чеклист проверен локально. Golden snapshot без сигналов → `unknown`, не `passed` (PROTO-12). Failed check → `blocked`. Passed → `closed_gate` + check report. `merge: true` → код 1. Негатив: merge принят — тест упал, откат. Команды `glt gate` нет. Шаг не `accepted` до зелёного GitHub CI на `wave2`.
