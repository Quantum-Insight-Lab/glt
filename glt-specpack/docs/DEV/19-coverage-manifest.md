---
id: glt.dev.19
owner: engineering
normativity: normative
status: review
wave: 2
depends_on:
  - glt.dev.18
spec_refs:
  - ../SPEC/impact.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/impact.md
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
---

# 19 — Coverage manifest

**Волна:** 2 · **Риск:** средний · **Gate:** нет

## Что делаем

- Boundary-манифест как данные покрытия. `coverage_not_established` выводится. «Полное влияние» вне манифеста запрещено. Команды `glt` не расширяются.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Вне boundary формулировка «полное влияние» запрещена машинно
- [x] `coverage_not_established` выставляется автоматически, а не вручную
- [x] Список узлов и рёбер манифеста сверяется с реестром

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [impact.md](../SPEC/impact.md)

## Статус

в дереве — ветка `wave2`. `rejectCompleteImpact` запрещает «полное влияние» вне манифеста. Флаг выводится. Bootstrap YAML сходится с `compileRegistry`. GitHub CI ещё не принимал шаг.
