# AGENTS.md — контракт исполнителя

Читается перед каждой задачей. Относится к людям и к AI-агентам одинаково.

Этот файл **снижает частоту** нарушений. Обнуляет её CI: см. [`glt-specpack/docs/SPEC/structural-invariants.md`](glt-specpack/docs/SPEC/structural-invariants.md). Если правило есть здесь и нет в CI — это договорённость, а не гарантия.

---

## Что это за проект

GLT Control Plane: наблюдаемая архитектура, анализ влияния изменений и контролируемые read/build-действия. Control plane **над** существующими источниками истины, не замена им.

Методология — Possibility-Driven Architecture v1.2. Нормативные контракты живут в `glt-specpack/`, код в `control-plane/`.

Статус: волна 1 (DEV-01…12). DEV-01…10 сделаны. DEV-11: seeded failures, в дереве.

---

## Карта слоёв

```
glt-specpack/            нормативные контракты — источник правды
control-plane/packages/
  contracts/             ГЕНЕРИРУЕМЫЕ типы из glt-specpack/contracts/schemas/
  domain/                чистая логика: канонизация, digest, resolve, обход, политика
  registry/              компилятор реестра
  snapshot/              компилятор снимков + порт хранилища
  collectors/            git, ci, otel адаптеры
  impact/                impact engine
  runner/                planner + executor
  audit/                 hash chain
  api/                   HTTP (волна 3)
  dashboard/             React (DEV-12)
  cli/                   glt
```

Направление зависимостей — только вниз по этому списку, плюс `contracts` доступен всем. Обход слоя запрещён (S-2). Граф импортов ацикличен (S-6).

`domain` не делает I/O. Единственное исключение — `node:crypto` (S-1).

---

## Реестр механизмов

**Использовать только эти.** Второй способ сделать то же — нарушение S-4, а не вкусовщина.

| Задача | Механизм | Где живёт |
|---|---|---|
| Валидация JSON Schema | `ajv` через `ajv/dist/2020` | `packages/contracts` |
| Генерация типов | `json-schema-to-typescript` из `glt-specpack/contracts/schemas/` | `packages/contracts` |
| Канонизация JSON | собственная реализация RFC 8785, без сторонних зависимостей | `packages/domain/src/canonical.ts` |
| Digest | `node:crypto` sha256, формат `sha256:<hex>` | `packages/domain/src/digest.ts` |
| Подпись | `node:crypto` Ed25519 | `packages/domain/src/signature.ts` |
| Парсинг YAML | `yaml` | `packages/contracts` |
| Параметры | загрузчик из `glt-specpack/parameters/` | `packages/domain/src/params.ts` |
| Authority map (INV-01) | `enforceAuthorityMap` | `packages/domain/src/authority.ts` |
| Разрешение alias | `resolveAlias` | `packages/domain/src/resolve.ts` |
| Компилятор реестра | `compileRegistry` | `packages/domain/src/resolve.ts`, `packages/registry/src/compile.ts` |
| Разрешение SourceRef | `resolveRef` | `packages/domain/src/sourceref.ts`, `packages/snapshot/src/resolve.ts` |
| Компилятор снимков | `compileSnapshot` | `packages/domain/src/snapshot.ts`, `packages/snapshot/src/compile.ts` |
| Intended мета-граф | `assembleIntendedGraph` из DEV frontmatter | `packages/domain/src/intended.ts`, `packages/registry/src/intended.ts` |
| Impact | `computeImpact` по матрице, не по зашитым правилам | `packages/domain/src/impact.ts`, `packages/impact/src/compute.ts` |
| Seeded changes | каталог YAML, GT не из engine | `glt-specpack/docs/EXPERIMENTS/seeded-changes.yaml` |
| Ошибки | один тип с полями `code`, `invariant`, `message`, `refs` | `packages/domain/src/errors.ts` |
| Вывод CLI | один писатель: артефакт в stdout, диагностика в stderr | `packages/cli/src/output.ts` |
| CLI-парсер | `commander` | `packages/cli` |
| Тесты | `vitest` | все пакеты |
| Границы и циклы | `dependency-cruiser` | корень, `.dependency-cruiser.cjs` |
| Мёртвый код | `knip` | корень |

Циклы ловит `dependency-cruiser` правилом `s6-no-circular`, а не отдельный
инструмент: он уже разрешает TS-алиасы `@glt/*`, и второй детектор циклов был бы
вторым механизмом на одну задачу — то есть нарушением S-4.

Замена механизма — PR, который **удаляет** старый. Не добавляет второй.

---

## Запреты

1. **Не писать типы руками.** Типы артефактов генерируются из JSON Schema. Ручное объявление — ошибка сборки, а не стиль.
2. **Не добавлять `event_type` мимо реестра.** Имена событий только из `glt-specpack/contracts/events/event-registry.yaml`, только через генерируемые константы. Строковый литерал в `emit` — ошибка сборки (S-3).
3. **Не расширять поверхность CLI.** Команды в точности равны списку в `docs/SPEC/cli.md`. `commit`, `push`, `deploy`, `self-upgrade`, `self-write` не существуют как команды, флаги или скрытые подкоманды (S-10).
4. **Ни одна команда v1 не пишет в рабочую копию.**
5. **Не считать digest вторым способом.** Только через `packages/domain/src/digest.ts` поверх канонизатора. Иначе PROTO-03 получает два ответа.
6. **Не хардкодить числа поведения.** Только через загрузчик параметров (S-8).
7. **Не добавлять зависимость без согласования.** Особенно в `domain`: там база доверия bootstrap verifier.
8. **Не заморозить golden digest вручную.** Значения `sha256:` + 64 нуля — placeholder; golden уже посчитал компилятор на DEV-09. Вписать хэш руками означает подделать оракул детерминизма.
9. **Не расширять граф домена самостоятельно.** См. «Конфликт».

---

## Порядок работы

Двухэтапность из методологии сохраняется.

1. **Спека.** Сначала контракт в `glt-specpack/`: какие инварианты затронуты, какие схемы меняются, какая ревизия. Правка контракта и правка кода — разные PR.
2. **Код.** Реализация против уже принятого контракта.

Задача, начинающаяся с кода при отсутствующем контракте, останавливается на шаге 1.

Правки в `glt-specpack/contracts/schemas/`, `registry/`, `trust/` — зона архитектора. Параллельно агентами не выполняются.

---

## Definition of Done

- [ ] Тесты на **все** затронутые инварианты; имя теста содержит ID (`PROTO-xx`, `INV-xx`, `S-x`)
- [ ] Реестр событий обновлён, если появилось событие
- [ ] Типы перегенерированы, а не отредактированы
- [ ] `spec_refs` и `source_refs` в затронутых документах разрешаются
- [ ] `glt lint docs`, `glt validate`, границы, циклы — зелёные
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Ревизия увеличена, если изменился исполняемый смысл (PROTO-09)

«Почти готово» не является состоянием. Либо DoD закрыт, либо задача продолжается.

---

## Конфликт: когда остановиться

Остановиться и сформулировать запрос архитектору, **не достраивая домен самостоятельно**, если задача требует:

- расширить граф домена или добавить bounded context;
- добавить новый тип связи (`relation`) или строку в propagation matrix;
- добавить новое событие;
- добавить capability или ActionSpec;
- изменить схему существующего артефакта;
- добавить зависимость в `domain`;
- обойти инвариант «потому что иначе не работает».

Последний пункт — самый важный. Инвариант, который мешает, либо описан неверно, либо задача поставлена неверно. И то и другое решается решением, а не обходом.

---

## Что читать перед задачей

| Вопрос | Документ |
|---|---|
| Что вообще происходит | `glt-specpack/README.md` |
| Компоненты и границы | `glt-specpack/docs/SPEC/architecture.md` |
| Инварианты протокола | `glt-specpack/docs/SPEC/invariants.md` |
| Инварианты сборки | `glt-specpack/docs/SPEC/structural-invariants.md` |
| Детерминизм и digest | `glt-specpack/docs/SPEC/snapshots.md` |
| Поверхность CLI | `glt-specpack/docs/SPEC/cli.md` |
| Правила обхода impact | `glt-specpack/docs/SPEC/impact.md` |
| Кто владеет каким фактом | `glt-specpack/trust/authority-map.yaml` |
| Текущий шаг | `glt-specpack/docs/DEV/` |
| Деление работы | `glt-specpack/docs/00-governance/parallel-work.md` |
