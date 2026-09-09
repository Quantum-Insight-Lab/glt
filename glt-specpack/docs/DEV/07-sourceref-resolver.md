---
id: glt.dev.07
owner: engineering
normativity: normative
status: accepted
wave: 1
depends_on:
  - glt.dev.06
spec_refs:
  - ../SPEC/provenance.md
  - ../SPEC/cli.md
  - ../SPEC/invariants.md
  - ../00-governance/metadata-contract.md
  - ../../contracts/schemas/source-ref.schema.json
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/provenance.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/00-governance/metadata-contract.md
    authority: governance-normativity
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/schemas/source-ref.schema.json
    authority: wire-schema
    role: derived-from
---

# 07 — Резолвер SourceRef

**Волна:** 1 · **Риск:** средний · **Gate:** нет

## Что делаем

- Команда `glt resolve`

## Конвенция пути

`path` разрешается относительно **корня репозитория**, названного в
`repository`, и никогда относительно корня пакета.

До версии 0.6.0 в пакете сосуществовали две конвенции — `docs/SPEC/...` и
`glt-specpack/docs/...`. Резолвер не может выбрать между ними, не догадываясь, а
догадываться ему запрещено ровно тем же правилом, что запрещает угадывать
неизвестный alias.

Вынос пакета в корень отдельного репозитория требует снять префикс
`glt-specpack/` со всех путей. Проверка существования из DEV-03 падает, если
этот шаг пропущен, поэтому пропустить его молча нельзя.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым.

### По шагу

- [x] `path` разрешается от корня репозитория, а не от корня пакета
- [x] Ссылка на несуществующий файл даёт ошибку, а не пустой результат
- [x] Selector работает: `lines:10-40` для текста, JSON Pointer для YAML и JSON
- [x] Ссылка без `commit` и `digest` годится для навигации, но отвергается как evidence для approval и gate
- [x] Несовпадение `digest` с содержимым файла роняет разрешение
- [x] Неоднозначная ссылка даёт ошибку, а не первый подходящий вариант (PROTO-02)

### Общее

- [x] CI зелёный на шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

### Чем проверить

```bash
pnpm resolve glt-specpack/docs/SPEC/registry.md
```

Рабочий вход — скрипт `resolve` в корневом `package.json` (через `tsx`).
То же: `pnpm glt resolve <ref>`. `<ref>` — alias, node id или JSON SourceRef.
Нет файла — код 5. Неоднозначный locator — код 3 (PROTO-02). Команда не пишет в рабочую копию.

## Спецификация

- [provenance.md](../SPEC/provenance.md)
- [cli.md](../SPEC/cli.md)
- [metadata-contract.md](../00-governance/metadata-contract.md)

## Статус

**сделано** — ветка `wave1`. `glt resolve`: `path` от корня репозитория, не от пакета. Нет файла, чужой digest, evidence без pins — код 5. Неоднозначный locator — код 3 (PROTO-02), не первый хит. Selector `lines:N-M` и JSON Pointer. В рабочую копию не пишет.

Негатив: pack-relative `docs/SPEC/registry.md`, отсутствующий файл, `role: evidence` без commit/digest, несовпавший digest, id=`foo` при alias=`foo` у другой записи. Живой YAML не правился. CI — шаг `resolve sourceref`.
