---
id: glt.dev.25
owner: engineering
normativity: normative
status: accepted
wave: 3
depends_on:
  - glt.dev.24
spec_refs:
  - ../SPEC/self-hosting.md
  - ../SPEC/architecture.md
  - ../SPEC/api.md
  - ../SPEC/cli.md
  - ../SPEC/snapshots.md
  - ../SPEC/structural-invariants.md
  - ../PDA/06-architectural-blueprint.md
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/self-hosting.md
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
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/snapshots.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/06-architectural-blueprint.md
    authority: methodology-pda
    role: derived-from
---

# 25 — Развёртывание через Compose

**Волна:** 3 · **Риск:** средний · **Gate:** нет

## Что делаем

- Docker Compose для self-hosted запуска

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Поднимается с нуля на чистой машине по документации
- [x] Версии образов закреплены digest, а не тегом
- [x] Секреты приходят извне, в репозитории их нет

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [self-hosting.md](../SPEC/self-hosting.md)

## Статус

**сделано** — ветка `wave3`. Compose поднимается; образы по digest; секреты снаружи. CI: [run](https://github.com/Quantum-Insight-Lab/glt/actions/runs/34809710510).
