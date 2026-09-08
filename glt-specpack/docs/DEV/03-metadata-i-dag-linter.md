---
id: glt.dev.03
owner: engineering
normativity: normative
status: accepted
wave: 1
depends_on:
  - glt.dev.01
spec_refs:
  - ../00-governance/metadata-contract.md
  - ../SPEC/cli.md
  - ../../contracts/schemas/source-ref.schema.json
  - ../../trust/authority-map.yaml
risk: medium
gate: pre-code
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/00-governance/metadata-contract.md
    authority: governance-normativity
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/schemas/source-ref.schema.json
    authority: wire-schema
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/trust/authority-map.yaml
    authority: governance-normativity
    role: derived-from
---

# 03 — Линтер метаданных и DAG

**Волна:** 1 · **Риск:** средний · **Gate:** pre-code

## Что делаем

- Проверка DAG документов
- Проверка **существования** целей `source_refs`
- Проверка существования целей markdown-ссылок в теле документов

## Существование, а не только структура

Проверка SourceRef по схеме подтверждает форму, но не цель. Ссылка на
перемещённый файл остаётся schema-valid и продолжает выглядеть авторитетной —
это хуже, чем ссылка, сломанная по форме: та себя выдаёт.

Пробел был настоящим. Перенос концептуальных документов в `archive/` сломал 41
путь в 26 файлах, а проверка версии 0.5.0 отрапортовала зелёным, потому что
смотрела только структуру. Линтер обязан разрешать каждый `path` относительно
корня репозитория и падать на любом отсутствующем.

То же правило действует для SourceRef внутри данных — бандл реестра, golden
фикстуры — а не только во frontmatter.

И для **markdown-ссылок в теле документов**. Пробел нашёлся на DEV-01: схему
`action-plan.schema.json` можно удалить, и ничто не упадёт, хотя на неё ссылается
[`runner.md`](../SPEC/runner.md) и её называет
[`traceability.md`](../00-governance/traceability.md). Схемы, от которых зависит
код или манифест, удалить молча уже нельзя — ломается кодогенерация, typecheck
или тест манифеста. А те, что держатся только на ссылке из документа, остаются
незащищёнными до этого шага.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым.

### По шагу

- [x] Документ в `docs/` без frontmatter роняет проверку
- [x] Цикл в `depends_on` обнаруживается и печатается полным путём цикла
- [x] Висячий `depends_on` роняет проверку
- [x] Неразрешимый `spec_refs` роняет проверку
- [x] **Несуществующая цель `source_refs` роняет проверку** — проверить, вернув путь `GLT-2.0.md` вместо `archive/GLT-2.0.md`
- [ ] То же для SourceRef внутри данных, не только во frontmatter
- [x] Битая markdown-ссылка в теле документа роняет проверку — проверить удалением `contracts/schemas/action-plan.schema.json`, на которую ссылается `runner.md`
- [x] `owner` нормативного документа вне authority map роняет проверку
- [x] Документ в `examples/**` с `normativity` не равной `non_normative` роняет проверку
- [ ] Есть тест с `S-7` в имени, если сверка реализуется здесь

### Общее

- [x] CI зелёный на шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

### Чем проверить

```bash
pnpm lint:docs
```

Глобальной команды `glt` нет: бинарник не в PATH, а `bin` указывает на `.ts`.
Рабочий вход — скрипт `lint:docs` в корневом `package.json` (через `tsx`).

## Спецификация

- [metadata-contract.md](../00-governance/metadata-contract.md)
- [cli.md](../SPEC/cli.md)
- [source-ref.schema.json](../../contracts/schemas/source-ref.schema.json)
- [authority-map.yaml](../../trust/authority-map.yaml)

## Статус

**сделано** — ветка `wave1`.

`glt lint docs` реализована и подключена к CI отдельным шагом. Проверяет 92
документа: наличие и разбираемость frontmatter, обязательные поля, уникальность
`id`, разрешимость `depends_on`, ацикличность, разрешимость `spec_refs`,
схема-валидность и **существование целей** `source_refs`, существование целей
markdown-ссылок в теле, `non_normative` для `examples/**`, owner из authority
map. Выход 2 при замечаниях — «нарушение контракта», отдельно от 3.

Поиск циклов вынесен в `packages/domain/src/graph.ts` чистой функцией и
возвращает полный путь цикла, а не факт его наличия: «spec.runner → spec.policy
→ spec.runner» можно чинить, «где-то есть цикл» — нет. Та же функция понадобится
обходу impact на DEV-10.

Проверено негативно, пять случаев, все пойманы: разрушенный форматтером
frontmatter, битая markdown-ссылка, несуществующий `spec_ref`, `source_ref` на
перемещённый файл, цикл в `depends_on`.

На первом же запуске линтер нашёл битую ссылку в
`runbooks/authority-conflict.md` — её писал я, и ни одна прежняя проверка её не
видела, потому что markdown-ссылки в теле никто не проверял.

**Ещё не в CI:** валидация схем и фикстур и сверка реестров инвариантов. Они
пока живут отдельными скриптами и переезжают в репозиторий на DEV-04 вместе с
`glt validate` и S-7.
