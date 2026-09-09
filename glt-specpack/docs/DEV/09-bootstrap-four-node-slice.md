---
id: glt.dev.09
owner: engineering
normativity: normative
status: accepted
wave: 1
depends_on:
  - glt.dev.08
spec_refs:
  - ../SPEC/snapshots.md
  - ../SPEC/topology.md
  - ../SPEC/cli.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../../contracts/schemas/snapshot.schema.json
  - ../../contracts/examples/golden/bootstrap-snapshot.json
  - ../../contracts/examples/golden/impact-bootstrap.json
  - ../../registry/boundaries/controlplane-intended.yaml
  - ../../registry/intended-components.yaml
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/snapshots.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/topology.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/schemas/snapshot.schema.json
    authority: wire-schema
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/examples/golden/bootstrap-snapshot.json
    authority: wire-schema
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/registry/boundaries/controlplane-intended.yaml
    authority: glt-id-registry
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/registry/intended-components.yaml
    authority: glt-id-registry
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 09 — Bootstrap-срез из четырёх узлов

**Волна:** 1 · **Риск:** средний · **Gate:** нет

## Что делаем

- Совпадение с golden-снимком
- Заморозка golden digests
- Второй boundary: полный intended мета-граф контрол-плейна

## Заморозка golden

Golden-фикстуры приезжают из пакета с зарезервированным placeholder-digest —
`sha256:` и 64 нуля. Этот шаг пересчитывает их компилятором и замораживает
результат.

Freeze-check **обязан отвергать** placeholder, иначе фикстура, которую забыли
перегенерировать, пройдёт как оракул детерминизма, ничего при этом не
подтверждая.

Замораживаются: `contracts/examples/golden/bootstrap-snapshot.json`
(`digest`, `source_digests`, `pinned_to.git_sha`) и
`contracts/examples/golden/impact-bootstrap.json` (`snapshot_digest`).

## Второй boundary

`glt.bootstrap-slice@1` остаётся четырёхузловым: это оракул детерминизма, и
маленький фиксированный оракул — весь его смысл.

Для измерения нужен другой граф. На четырёх узлах и трёх рёбрах правильный ответ
виден глазами, поэтому recall равен 1.0 у любой реализации, включая
неправильную, и метрика не различает ничего. Correctness gate работает на втором
boundary `glt.controlplane-intended@1` — полном мета-графе контрол-плейна:
одиннадцать компонентов, шаги DEV с их зависимостями, checks и gates.

Это **чистые данные**. Intended-плоскость собирается из реестра и
машиночитаемого frontmatter шагов DEV, коллекторы не участвуют, поэтому ничто из
волны 2 не является предусловием. Вручную пишутся только GLT-ID и SourceRef:
если для поддержки карты придётся заново размечать все 35 шагов, пилот
останавливается — карта станет вторым источником истины.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым.

### Заморозка

- [x] Ни один digest в golden не равен 64 нулям
- [x] Freeze-check падает, если вернуть placeholder обратно
- [x] Пересборка снимка даёт ровно замороженный digest
- [x] `pinned_to.git_sha` заполнен настоящим SHA

### Мета-граф

- [x] `glt.controlplane-intended@1` существует как boundary-манифест
- [x] Статусы, зависимости и `expected_from_step` берутся из frontmatter шагов DEV, а не продублированы руками
- [x] Правка `depends_on` в шаге DEV меняет граф без ручной синхронизации
- [x] Оба boundary сосуществуют: детерминизм проверяется на срезе, recall измеряется на мета-графе
- [x] Плановый узел без кода не считается сломанным — у него есть `expected_from_step`

### Общее

- [x] CI зелёный на шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

### Чем проверить

```bash
pnpm compile:snapshot -- --as-of 2026-08-14T10:00:00Z
pnpm compile:snapshot -- --as-of 2026-08-14T10:00:00Z --boundary glt.controlplane-intended@1
pnpm test
```

Рабочий вход — скрипт `compile:snapshot` в корневом `package.json` (через `tsx`).
То же: `pnpm glt compile snapshot`. Артефакт в stdout, в рабочую копию не пишет.

## Спецификация

- [snapshots.md](../SPEC/snapshots.md)
- [topology.md](../SPEC/topology.md)
- [cli.md](../SPEC/cli.md)

## Статус

**сделано** — ветка `wave1`. Golden digest заморожен `compileSnapshot`, не руками. Freeze-check отвергает `sha256:` + 64 нуля. Второй boundary `glt.controlplane-intended@1` собирается из DEV frontmatter; срез из четырёх узлов остаётся оракулом детерминизма. CLI в рабочую копию не пишет.

Негатив: неизвестный `depends_on` (код 2); возврат placeholder в digest. Живой YAML среза не правился. CI — шаг `compile intended snapshot`.
