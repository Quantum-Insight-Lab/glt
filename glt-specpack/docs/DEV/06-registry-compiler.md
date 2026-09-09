---
id: glt.dev.06
owner: engineering
normativity: normative
status: planned
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

- [ ] Один alias в одном namespace и версии реестра разрешается максимум в один id (PROTO-01)
- [ ] Неизвестный или неоднозначный alias даёт ошибку, а не догадку (PROTO-02)
- [ ] Переназначение alias внутри совместимой версии реестра отвергается (PROTO-08)
- [ ] Расхождение между бандлом и boundary-манифестом роняет компиляцию, а не игнорируется
- [ ] Изменение исполняемого смысла без увеличения revision отвергается (PROTO-09)

### Общее

- [ ] CI зелёный на всех шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

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

запланирован
