---
id: glt.dev.13
owner: engineering
normativity: normative
status: planned
wave: 2
depends_on:
  - glt.dev.12
spec_refs:
  - ../SPEC/collectors.md
  - ../SPEC/snapshots.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
  - ../SPEC/architecture.md
  - ../SPEC/cli.md
  - ../PDA/04-invariants.md
  - ../../parameters/collector-git-freshness.yaml
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/collectors.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/snapshots.md
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
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/parameters/collector-git-freshness.yaml
    authority: parameter-values
    role: derived-from
---

# 13 — Git collector

**Волна:** 2 · **Риск:** средний · **Gate:** нет

## Что делаем

- Materialized-факты: граф модулей, source digests
- Коллектор в `packages/collectors`. Команды `glt collect` нет.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Коллектор собирает факты и не принимает решений политики
- [x] `source_digests` совпадают при повторном запуске на том же commit
- [x] Факты помечены планом `materialized` и не смешиваются с `intended`
- [x] Отсутствие данных даёт `unknown`, а не пустоту, которую видно как «всё в порядке»

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [collectors.md](../SPEC/collectors.md)

## Статус

чеклист закрыт — шаг не accepted
