---
id: glt.dev.16
owner: engineering
normativity: normative
status: planned
wave: 2
depends_on:
  - glt.dev.15
spec_refs:
  - ../SPEC/topology.md
  - ../SPEC/provenance.md
  - ../SPEC/invariants.md
  - ../SPEC/cli.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../../parameters/snapshot-stale-after.yaml
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/topology.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/provenance.md
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
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/parameters/snapshot-stale-after.yaml
    authority: parameter-values
    role: derived-from
---

# 16 — State evaluator

**Волна:** 2 · **Риск:** средний · **Gate:** нет

## Что делаем

- Вычисление осей состояния узла
- `glt health` — свежесть снимка и классификация осей. Не пишет в копию.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Оси независимы: `verification`, `runtime`, `freshness`, `change`, `coverage`, `delivery`, `conflict`
- [x] `unknown` визуально и машинно отличается от `healthy`
- [x] Evaluator только читает и классифицирует, но не создаёт evidence
- [x] Inferred-факт нигде не подаётся как наблюдение (sheet INV-04)

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [topology.md](../SPEC/topology.md)

## Статус

в дереве — чеклист проверен локально. `glt health` на golden: `runtime: unknown` ≠ `healthy`, код 5 (PROTO-12). Delivery — `declaration` со снимка. Негатив: inferred → observation — INV-04 упал, откат. `createEvidence` отвергается. Шаг не `accepted` до зелёного GitHub CI на `wave2`.
