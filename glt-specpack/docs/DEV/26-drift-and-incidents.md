---
id: glt.dev.26
owner: engineering
normativity: normative
status: accepted
wave: 3
depends_on:
  - glt.dev.25
spec_refs:
  - ../SPEC/degradation.md
  - ../SPEC/impact.md
  - ../SPEC/architecture.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/degradation.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/impact.md
    authority: impact-propagation-rules
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
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
---

# 26 — Drift и инциденты

**Волна:** 3 · **Риск:** средний · **Gate:** нет

## Что делаем

- Классификаторы drift и распространения инцидентов

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Incident-обход идёт по отдельной матрице, не смешиваясь с change
- [x] Materialized-путь помечается кандидатом, observed trace-parentage — подтверждением
- [x] Расхождение deployment и build hash даёт drift, а не молчание

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [degradation.md](../SPEC/degradation.md)

## Статус

**сделано** — ветка `wave3`. Incident отдельно от change; hash mismatch — drift. CI: [run](https://github.com/Quantum-Insight-Lab/glt/actions/runs/34810665642).
