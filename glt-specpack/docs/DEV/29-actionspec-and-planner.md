---
id: glt.dev.29
owner: engineering
normativity: normative
status: planned
wave: 4
depends_on:
  - glt.dev.28
spec_refs:
  - ../SPEC/runner.md
  - ../SPEC/policy.md
  - ../SPEC/architecture.md
  - ../SPEC/cli.md
  - ../SPEC/api.md
  - ../SPEC/events.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
risk: high
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/runner.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/policy.md
    authority: policy-approval
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/api.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/events.md
    authority: event-registry
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 29 — ActionSpec и planner

**Волна:** 4 · **Риск:** высокий · **Gate:** нет

## Что делаем

- Сборка immutable plan из зарегистрированных действий

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [ ] Plan собирается только из зарегистрированных ActionSpec, произвольная строка невозможна
- [ ] Execution DAG ацикличен (PROTO-07)
- [ ] Envelope содержит все digests: plan, policy, executor image, snapshot (PROTO-14)

### Общее

- [ ] CI зелёный на всех шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [runner.md](../SPEC/runner.md)

`buildPlan` принимает каталог ActionSpec уже разобранным. Неизвестный
id или capability — PROTO-13 / INV-06. Цикл `depends_on` — `findCycles`
(PROTO-07, S-4). Envelope — четыре digest через `digestOf` (PROTO-14).
Событие `glt.plan.created` уже в реестре. `registry/` и схемы не
правятся. Команды `glt` не добавляются.

## Статус

в работе — ветка `wave4`. Чеклист пуст до живой проверки и зелёного CI.
