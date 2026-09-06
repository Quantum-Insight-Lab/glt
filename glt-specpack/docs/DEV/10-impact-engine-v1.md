---
id: glt.dev.10
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on:
  - glt.dev.09
spec_refs:
  - ../SPEC/impact.md
risk: high
gate: none
source_refs: []
---

# 10 — Impact engine v1

**Волна:** 1 · **Риск:** высокий · **Gate:** нет

## Что делаем

- Команда `glt impact`
- Отчёт о влиянии изменения

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [ ] Обход идёт по матрице, а не по зашитым в код правилам: подмена матрицы меняет результат
- [ ] Отношение без строки в матрице даёт `known_unknowns` с `kind: uncovered_relation`
- [ ] Изменение, выходящее за boundary, даёт непустой `known_unknowns`
- [ ] `validates` кладёт check в `required_checks`, а не в `affected_nodes`
- [ ] Отчёт несёт `snapshot_digest`, `classifier_version` и `matrix_version`
- [ ] Golden-случай `impact-bootstrap.json` воспроизводится точно

### Общее

- [ ] CI зелёный на всех шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

### Чем проверить

```bash
pnpm exec glt impact --output json
```

## Спецификация

- [impact.md](../SPEC/impact.md)

## Статус

запланирован
