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
risk: medium
gate: none
source_refs: []
---

# 16 — State evaluator

**Волна:** 2 · **Риск:** средний · **Gate:** нет

## Что делаем

- Вычисление осей состояния узла

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [ ] Оси независимы: `verification`, `runtime`, `freshness`, `change`, `coverage`, `delivery`, `conflict`
- [ ] `unknown` визуально и машинно отличается от `healthy`
- [ ] Evaluator только читает и классифицирует, но не создаёт evidence
- [ ] Inferred-факт нигде не подаётся как наблюдение (sheet INV-04)

### Общее

- [ ] CI зелёный на всех шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [topology.md](../SPEC/topology.md)

## Статус

запланирован
