---
id: glt.dev.08
owner: engineering
normativity: normative
status: accepted
wave: 1
depends_on:
  - glt.dev.06
  - glt.dev.07
spec_refs:
  - ../SPEC/snapshots.md
  - ../SPEC/cli.md
  - ../SPEC/invariants.md
  - ../SPEC/topology.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../../contracts/schemas/snapshot.schema.json
  - ../../contracts/examples/golden/bootstrap-snapshot.json
risk: high
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/snapshots.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/topology.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/schemas/snapshot.schema.json
    authority: wire-schema
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 08 — Компилятор снимков

**Волна:** 1 · **Риск:** высокий · **Gate:** нет

## Что делаем

- Bootstrap-снимок
- Канонизатор RFC 8785 с собственными тестовыми векторами

## Почему сначала векторы

PROTO-03 становится проверяемым только после реализации канонической формы:
сортировка неупорядоченных массивов, сериализация JCS, нормализация строк в NFC,
digest по документу с удалённым членом `digest`.

Векторы пишутся **до** компилятора, а не после. Реализация без векторов создаёт
видимость детерминизма: снимок совпадает сам с собой, и этого достаточно, чтобы
тест был зелёным, но недостаточно, чтобы digest совпал на другой машине.

Канонизатор живёт в `packages/domain` без сторонних зависимостей, чтобы
bootstrap verifier не расширял базу доверия.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым.

### Канонизатор

- [x] Тестовые векторы RFC 8785 проходят, и их видно в выводе тестов
- [x] Массивы сортируются: узлы и рёбра по `metadata.id`, assertions по `plane`, остальные лексикографически
- [x] Строки нормализуются в NFC — проверить на глифах в aliases
- [x] Канонизатор не тянет ни одной сторонней зависимости
- [x] Digest считается по документу **с удалённым** членом `digest`, а не с обнулённым

### Снимок

- [x] Два прогона на одном входе дают побайтово одинаковый результат
- [x] Изменение `as_of` на секунду меняет digest, изменение порядка ключей в источнике — нет
- [x] В снимке материализованы defaults: `sensitivity`, `capabilities`, `signals` (PROTO-05)
- [x] Узлы и рёбра — полные объекты, а не список id (PROTO-04)
- [x] Снимок закреплён за git SHA, artifact digest или deployment id (PROTO-10)
- [x] Digest считается только через `packages/domain/src/digest.ts` — второго способа нет

### Общее

- [x] CI зелёный на шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

### Чем проверить

```bash
pnpm compile:snapshot -- --as-of 2026-08-14T10:00:00Z
pnpm compile:snapshot -- --as-of 2026-08-14T10:00:00Z
```

Рабочий вход — скрипт `compile:snapshot` в корневом `package.json` (через `tsx`).
То же: `pnpm glt compile snapshot`. Артефакт в stdout, в рабочую копию не пишет.
Golden digest остаётся placeholder до DEV-09.

## Спецификация

- [snapshots.md](../SPEC/snapshots.md)
- [cli.md](../SPEC/cli.md)
- [topology.md](../SPEC/topology.md)

## Статус

**сделано** — ветка `wave1`. `glt compile snapshot`: JCS, NFC, defaults, pin. Digest через `digest.ts` по документу без члена `digest`. Артефакт в stdout, в рабочую копию не пишет. Golden digest — placeholder до DEV-09.

Негатив: снимок как `--registry` (S-5, код 2); список id вместо объектов (PROTO-04, код 2); пустой pin (PROTO-10, код 3); второй `createHash("sha256")` вне `digest.ts`. Живой YAML не правился. CI — шаг `compile snapshot`.
