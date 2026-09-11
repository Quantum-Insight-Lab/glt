---
id: glt.dev.18
owner: engineering
normativity: normative
status: planned
wave: 2
depends_on:
  - glt.dev.17
spec_refs:
  - ../SPEC/architecture.md
  - ../SPEC/topology.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../PDA/03-domain-graph.md
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
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
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/03-domain-graph.md
    authority: methodology-pda
    role: derived-from
---

# 18 — Расширение build-плоскости топологии

**Волна:** 2 · **Риск:** средний · **Gate:** нет

## Что делаем

- Build-плоскость поверх intended
- `comparePlanes`: intended и materialized сравниваются, не сливаются. Команды `glt` не расширяются.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Intended и materialized хранятся раздельно и сравниваются, а не сливаются
- [x] Расхождение между планами видно как отдельный класс, а не как поломка
- [x] Плановый узел без кода не считается сломанным: у него есть `expected_from_step`

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [architecture.md](../SPEC/architecture.md)

## Статус

в дереве — ветка `wave2`. Живой intended-снимок: `glt.dev.19` planned + `expectedFromStep`; ребро держит `intended: asserted` и `materialized: not_observed` раздельно. Сравнение на HEAD: `glt.controlplane.domain` aligned, `glt.controlplane.runner` `plane_drift` (не broken), `glt.dev.19` expected. Негатив: expected → plane_drift → PROTO-05 падает. `accepted` после зелёного GitHub CI.
