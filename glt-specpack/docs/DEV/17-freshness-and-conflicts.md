---
id: glt.dev.17
owner: engineering
normativity: normative
status: planned
wave: 2
depends_on:
  - glt.dev.16
spec_refs:
  - ../SPEC/degradation.md
  - ../SPEC/topology.md
  - ../SPEC/provenance.md
  - ../SPEC/invariants.md
  - ../SPEC/cli.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../../parameters/snapshot-stale-after.yaml
risk: high
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/degradation.md
    authority: engineering-contract
    role: derived-from
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

# 17 — Freshness и конфликты

**Волна:** 2 · **Риск:** высокий · **Gate:** нет

## Что делаем

- Определение устаревания и расхождения источников
- `assessDegradation` / `currentSignal` / `detectFactConflict`. Порог только из P01. Команды `glt` не расширяются.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Снимок старше `snapshot.stale_after_seconds` (P01) помечается и блокирует write
- [x] Просроченный сигнал исключается из расчёта здоровья (PROTO-11)
- [x] Расхождение двух авторитетных источников даёт `source_conflict`
- [x] Порог берётся из parameter card, а не из литерала в коде (S-8)

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [degradation.md](../SPEC/degradation.md)

## Статус

в дереве — ветка `wave2`. Живой `glt health`: current `write_blocked: false`, ttl 3600 из P01; as-of +2h → stale, warn, `write_blocked: true`, код 5. Негатив: снять отсечение сигнала → PROTO-11 падает; `writeBlocked` всегда false → тесты write-block падают. `accepted` после зелёного GitHub CI.
