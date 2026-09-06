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
risk: high
gate: none
source_refs: []
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

## Статус

запланирован
