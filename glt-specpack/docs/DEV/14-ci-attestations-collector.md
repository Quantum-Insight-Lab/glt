---
id: glt.dev.14
owner: engineering
normativity: normative
status: planned
wave: 2
depends_on:
  - glt.dev.13
spec_refs:
  - ../SPEC/collectors.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
  - ../SPEC/cli.md
  - ../PDA/04-invariants.md
  - ../../parameters/collector-ci-freshness.yaml
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/collectors.md
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
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/parameters/collector-ci-freshness.yaml
    authority: parameter-values
    role: derived-from
---

# 14 — Collector CI-аттестаций

**Волна:** 2 · **Риск:** средний · **Gate:** нет

## Что делаем

- Приём отчётов тестов и аттестаций CI
- Коллектор в `packages/collectors`. Команды `glt collect` нет.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Отчёт без привязки к commit не принимается
- [x] Просроченный отчёт помечается `stale`, а не учитывается как свежий (PROTO-11)
- [x] Провал сбора даёт `coverage: partial` и запись в `known_unknowns`

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [collectors.md](../SPEC/collectors.md)

## Статус

в дереве — чеклист проверен локально. `pnpm collect:ci` без commit → код 5 (PROTO-12). Тот же fixture через 2 ч → `freshness: stale`, `current_checks: []` (PROTO-11). Нет файла при pin commit → `partial` + `known_unknowns`. Негатив: `current_checks = checks` всегда — PROTO-11 упал, откат. Команды `glt collect` нет. Шаг не `accepted` до зелёного GitHub CI на `wave2`.
