---
id: glt.dev.10
owner: engineering
normativity: normative
status: accepted
wave: 1
depends_on:
  - glt.dev.09
spec_refs:
  - ../SPEC/impact.md
  - ../SPEC/cli.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../../contracts/schemas/impact-report.schema.json
  - ../../contracts/schemas/propagation-matrix.schema.json
  - ../../contracts/propagation/propagation-matrix.yaml
  - ../../contracts/examples/golden/impact-bootstrap.json
  - ../../parameters/impact-traversal-depth.yaml
risk: high
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/impact.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/schemas/impact-report.schema.json
    authority: wire-schema
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/propagation/propagation-matrix.yaml
    authority: impact-propagation-rules
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/examples/golden/impact-bootstrap.json
    authority: wire-schema
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/parameters/impact-traversal-depth.yaml
    authority: parameter-values
    role: derived-from
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

- [x] Обход идёт по матрице, а не по зашитым в код правилам: подмена матрицы меняет результат
- [x] Отношение без строки в матрице даёт `known_unknowns` с `kind: uncovered_relation`
- [x] Изменение, выходящее за boundary, даёт непустой `known_unknowns`
- [x] `validates` кладёт check в `required_checks`, а не в `affected_nodes`
- [x] Отчёт несёт `snapshot_digest`, `classifier_version` и `matrix_version`
- [x] Golden-случай `impact-bootstrap.json` воспроизводится точно

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

### Чем проверить

```bash
pnpm impact -- --snapshot glt-specpack/contracts/examples/golden/bootstrap-snapshot.json -o json
pnpm test
```

Рабочий вход — скрипт `impact` в корневом `package.json` (через `tsx`).
То же: `pnpm glt impact`. Артефакт в stdout, в рабочую копию не пишет.

## Спецификация

- [impact.md](../SPEC/impact.md)
- [cli.md](../SPEC/cli.md)

## Статус

**сделано** — ветка `wave1`. `glt impact`: обход по матрице, не по зашитым правилам. Check из `validates` — в `required_checks`, gate — в `release`. CLI в рабочую копию не пишет.

Негатив: impact-отчёт как `--snapshot` (код 2); `writes` без строки матрицы → `uncovered_relation`; выход за boundary → `outside_boundary`. Живой YAML среза не правился. CI — шаг `impact`.
