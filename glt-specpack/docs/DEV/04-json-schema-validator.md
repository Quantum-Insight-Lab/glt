---
id: glt.dev.04
owner: engineering
normativity: normative
status: accepted
wave: 1
depends_on:
  - glt.dev.01
spec_refs:
  - ../SPEC/registry.md
  - ../SPEC/topology.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
  - ../SPEC/cli.md
  - ../OBSERVABILITY/metrics.md
  - ../../contracts/schemas/boundary-manifest.schema.json
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/contracts/schemas/boundary-manifest.schema.json
    authority: wire-schema
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/examples/valid/registry-entry.json
    authority: wire-schema
    role: informative
  - repository: glt-controlplane
    path: AGENTS.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
---

# 04 — Валидатор JSON Schema

**Волна:** 1 · **Риск:** средний · **Gate:** нет

## Что делаем

- Набор тестов схем
- Сверка S-7 «инвариант ↔ тест»: сначала аудит, потом блокирующий режим
- Тест-перепись механизмов S-4

## Сверка S-7

Сверка разбирает ID из трёх реестров — `PROTO-xx`, `INV-xx`, `S-x` — и из имён
тестов, после чего печатает разрыв как `glt_structural_coverage`.

Исходная линия: 0 из 40. Инвариант, относящийся к нереализованной волне,
помечается отложенным с указанием шага DEV. **Отложенный считается непокрытым**
и остаётся видимым — молча пропустить его нельзя, иначе метрика начнёт врать в
приятную сторону.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым.

### Схемы

- [x] Все 12 схем компилируются в ajv в strict mode
- [x] Каждая фикстура ведёт себя как ожидается: `valid/` проходит, `invalid/` падает
- [x] Реестр, boundary-манифест, матрица и реестр событий валидны своими схемами
- [x] Схема, которую ajv считает нестрогой, чинится в схеме, а не отключением флага

### S-7

- [x] Сверка находит ID во всех трёх реестрах: 18 PROTO, 12 INV, 10 S
- [x] Инвариант без теста попадает в отчёт, а не пропадает
- [x] Отложенный инвариант помечен шагом DEV и считается **непокрытым**
- [x] `glt_structural_coverage` печатается числом, а не словом «ок»
- [x] Удаление ID из имени существующего теста роняет сверку

### S-4

- [x] Перепись находит все механизмы из реестра в `AGENTS.md`
- [x] Вторая реализация любого механизма роняет тест — проверить, добавив второй вызов `createHash("sha256")` вне `digest.ts`

### Общее

- [x] CI зелёный на шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

### Чем проверить

```bash
pnpm validate
pnpm test
```

`pnpm validate` сам вызывает `pnpm gen`. `pnpm glt validate` gen не делает.

В артефакте `glt_structural_coverage` — число: `0.325` (13/40) на момент приёмки. Отложенные ID видны, в знаменателе.

## Спецификация

- [registry.md](../SPEC/registry.md)
- [topology.md](../SPEC/topology.md)
- [invariants.md](../SPEC/invariants.md)
- [structural-invariants.md](../SPEC/structural-invariants.md)
- [cli.md](../SPEC/cli.md)
- [metrics.md](../OBSERVABILITY/metrics.md)

## Статус

**сделано** — ветка `wave1`. `glt validate [path...]` schema-validate реестра, boundary-манифеста, матрицы, реестра событий и фикстур. Без аргументов invalid-фикстуры не входят: они обязаны падать. Нарушение схемы — код 2.

В пакете **13** схем: исходные 12 плюс `boundary-manifest.schema.json` — своей схемы у boundary не было. Все компилируются в ajv `strict: true`; нестрогая схема чинится в схеме, флаг не снимается.

S-7 блокирует: 18 PROTO + 12 INV + 10 S. Отложенные перечислены в `structural-invariants.md` с шагом DEV и считаются непокрытыми. Снятие `INV-10` из имён тестов роняет сверку.

S-4: перепись находит все 13 механизмов из `AGENTS.md`. Второй `createHash("sha256")` вне `digest.ts` роняет тест.

Негатив: invalid-фикстуры, неизвестное ключевое слово при `strict: true`, второй sha256, удаление ID из имени теста.
