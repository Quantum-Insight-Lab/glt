---
id: glt.dev.06
owner: engineering
normativity: normative
status: accepted
wave: 1
depends_on:
  - glt.dev.04
spec_refs:
  - ../SPEC/registry.md
  - ../SPEC/cli.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../../contracts/schemas/registry-bundle.schema.json
  - ../../registry/glt-controlplane.yaml
  - ../../registry/boundaries/bootstrap-slice.yaml
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/registry.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/registry/glt-controlplane.yaml
    authority: glt-id-registry
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 06 — Компилятор реестра

**Волна:** 1 · **Риск:** средний · **Gate:** нет

## Что делаем

- Скомпилированный реестр
- Разрешение aliases

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Один alias в одном namespace и версии реестра разрешается максимум в один id (PROTO-01)
- [x] Неизвестный или неоднозначный alias даёт ошибку, а не догадку (PROTO-02)
- [x] Переназначение alias внутри совместимой версии реестра отвергается (PROTO-08)
- [x] Расхождение между бандлом и boundary-манифестом роняет компиляцию, а не игнорируется
- [x] Изменение исполняемого смысла без увеличения revision отвергается (PROTO-09)

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

### Чем проверить

```bash
pnpm compile:registry
```

Рабочий вход — скрипт `compile:registry` в корневом `package.json` (через `tsx`).
То же: `pnpm glt compile registry`. Нарушение инварианта — код 3, расхождение с boundary — код 2. Команда не пишет в рабочую копию.

## Спецификация

- [registry.md](../SPEC/registry.md)
- [cli.md](../SPEC/cli.md)
- [invariants.md](../SPEC/invariants.md)
- [04-invariants.md](../PDA/04-invariants.md) — sheet INV-02
- [glt-controlplane.yaml](../../registry/glt-controlplane.yaml)
- [bootstrap-slice.yaml](../../registry/boundaries/bootstrap-slice.yaml)

## Статус

**сделано** — ветка `wave1`. `glt compile registry` строит уникальный индекс `(alias, namespace, version)` с NFC. Неизвестный или неоднозначный alias — код 3, без догадки (PROTO-02, INV-02). Два id на один alias — PROTO-01. Переназначение внутри той же версии — PROTO-08. Смена `spec` без revision — PROTO-09. Расхождение бандла с boundary — код 2. В рабочую копию не пишет.

Негатив: синтетический бандл. Живой YAML не правился. CI — шаг `compile registry`.
