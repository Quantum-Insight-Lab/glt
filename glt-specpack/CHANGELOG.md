# CHANGELOG

Формат основан на [Keep a Changelog](https://keepachangelog.com/).

## [0.26.0] — 2026-09-11

DEV-20: обе плоскости в одном снимке (pin, не merge) и B1 Change dashboard.

### Added

- Контракт: intended `nodes[]` не принимает git-модули. Снимок intended boundary пинит `collector_versions.git` и `source_digests.git.*`. Golden bootstrap не меняется (PROTO-03).
- `projectChangeSurface`: проекция режима Change. P03 режет карту. Слой глифов заблокирован (E04). Статус с дашборда не пишется (S-5).
- Пакет `@glt/dashboard` (React, только чтение). Команды `glt` не расширяются. Шаг CI `build plane and dashboard`.

### Notes

- API запросов действий — DEV-21. Дашборд не вызывает компилятор (S-2).
- Golden digest и `impact-bootstrap.json` не менялись.
- Шаг принят: `docs/DEV/20-build-plane-acceptance.md` — `status: accepted`. Покрытие `glt_structural_coverage`: **0.75 (30/40)**.

## [0.25.0] — 2026-09-11

DEV-19: boundary-манифест — данные покрытия, не список узлов снимка.

### Added

- Контракт покрытия в `docs/SPEC/impact.md`. Список узлов и рёбер сверяется с реестром. `coverage_not_established` выводится из `outside_boundary` / `unmapped_source`. Формулировка «полное влияние» вне манифеста запрещена (INV-05).
- `packages/domain/src/coverage-manifest.ts`. `glt impact` берёт covered set из манифеста. Команды `glt` не расширяются. Шаг CI `coverage manifest`.

### Notes

- Не путать с S-7 `coverage.ts` (сверка инвариантов с тестами).
- Intended YAML не расширяется: собранный мета-граф по-прежнему из frontmatter.
- Golden digest и `impact-bootstrap.json` не менялись.
- Шаг принят: `docs/DEV/19-coverage-manifest.md` — `status: accepted`. Покрытие `glt_structural_coverage`: **0.75 (30/40)**.

## [0.24.0] — 2026-09-11

DEV-18: build-плоскость — intended и materialized сравниваются, не сливаются.

### Added

- Контракт `comparePlanes` в `docs/SPEC/architecture.md`. Две плоскости остаются двумя списками. Совпадение по SourceRef path — `aligned`. Плановый узел с `expected_from_step` — `expected` (PROTO-05). Иной разъезд — `plane_drift`, не поломка.
- `packages/domain/src/planes.ts`. Команды `glt` не расширяются. Снимок с обеими плоскостями — DEV-20.
- Шаг CI `topology expansion`.

### Notes

- Шаг принят: `docs/DEV/18-topology-expansion.md` — `status: accepted`. Покрытие `glt_structural_coverage`: **0.75 (30/40)**.

## [0.23.0] — 2026-09-11

DEV-17: freshness и конфликты — stale блокирует write, просроченный сигнал не в health.

### Added

- Контракт `assessDegradation` в `docs/SPEC/degradation.md`. Снимок старше P01: warn, `write_blocked`, read разрешён. Два дайджеста одного класса: `source_conflict`, код 6, победитель не выбирается.
- `packages/domain/src/degrade.ts`. `currentSignal` отсекает возраст через `snapshotIsStale` (PROTO-11, S-4). Порог только из карточки P01 (S-8). `glt health` не расширяет поверхность CLI.
- Шаг CI `freshness and conflicts`.

### Notes

- Шаг принят: `docs/DEV/17-freshness-and-conflicts.md` — `status: accepted`. Покрытие `glt_structural_coverage`: **0.75 (30/40)**.

## [0.22.0] — 2026-09-11

DEV-16: state evaluator — независимые оси, inferred ≠ observation.

### Added

- Контракт `evaluateState` в `docs/SPEC/topology.md`. Оси не схлопываются в один цвет. `runtime: unknown` никогда не `healthy` (PROTO-12). Inferred не переписывается в observation (INV-04).
- `packages/domain/src/state.ts` и `glt health`. Свежесть снимка через `snapshotIsStale` и P01. Evaluator не создаёт evidence. Шаг CI `state evaluator`.
- INV-04 снят с отложения S-7.

### Notes

- `source_conflict` и блокировка write — DEV-17.
- Шаг принят: `docs/DEV/16-state-evaluator.md` — `status: accepted`. Покрытие `glt_structural_coverage`: **0.75 (30/40)**.

## [0.21.0] — 2026-09-11

DEV-15: связывание checks и gates — вычислитель состояния, без merge.

### Added

- Контракт `evaluateGate` в `docs/SPEC/gates.md`. Обязательный check без сигнала → `unknown` (PROTO-12). Упавший check → `blocked`. Каждый результат несёт evidence. `merge` отвергается.
- `packages/domain/src/gate.ts`. Команды `glt gate` нет. `glt health` остаётся DEV-16. Шаг CI `checks and gates wiring`.

### Notes

- Коллектор по-прежнему не решает gate. Слияние в snapshot — DEV-18.
- Шаг принят: `docs/DEV/15-checks-and-gates-wiring.md` — `status: accepted`. Покрытие `glt_structural_coverage`: **0.725 (29/40)**.

## [0.20.0] — 2026-09-10

DEV-14: CI attestations collector — факты с pinned commit, stale не входит в current.

### Added

- Контракт `glt.collector.ci@1` в `docs/SPEC/collectors.md`. Отчёт без commit не принимается (PROTO-12). Просроченный отчёт — `freshness: stale`, `current_checks` пуст (PROTO-11, `snapshotIsStale`).
- Карточка `glt.param.collector.ci.freshness_ttl_seconds` (P09, 3600). Пакет `@glt/collectors`: `collectCiFacts`. Шаг CI `ci attestations collector`. Команды `glt collect` нет.
- PROTO-11 снят с отложения S-7.

### Notes

- Коллектор не решает gate/release. Слияние в snapshot — DEV-18.
- Шаг принят: `docs/DEV/14-ci-attestations-collector.md` — `status: accepted`. Покрытие `glt_structural_coverage`: **0.725 (29/40)**.

## [0.19.0] — 2026-09-10

DEV-13: git collector — materialized-факты с pinned commit, без политики и без новой CLI-команды.

### Added

- Контракт git collector v1 в `docs/SPEC/collectors.md`: факты с дерева commit, не из рабочей копии. `coverage: unknown` при отсутствии commit/git/workspace; нет CODEOWNERS — `file_ownership_hints: null`, не `[]`.
- Карточка `glt.param.collector.git.freshness_ttl_seconds` (P08, 3600). Пакет `@glt/collectors`: `module_graph` из workspace-манифестов, `source_digests` через `digestOfUtf8`. Шаг CI `git collector`. Команды `glt collect` нет.
- PROTO-12 снят с отложения S-7: нет commit ≠ установленный пустой граф.

### Notes

- Слияние materialized в snapshot — DEV-18. Golden digest и `collector_versions` снимка не менялись.
- Шаг принят: `docs/DEV/13-git-collector.md` — `status: accepted`. Покрытие `glt_structural_coverage`: **0.7 (28/40)**.

## [0.18.0] — 2026-09-10

DEV-12: correctness gate — recall на авторизованном наборе, holdout H01–H05 без false-green.

### Added

- Стенд E02a/E02b: recall `required_checks` и `affected_nodes` против каталога DEV-11 (`glt.seeded-slice@1`). Гейтится полнота (каждый id истины присутствует); precision публикуется и порогом не является.
- E03: holdout H01–H05 даёт ожидаемый не-зелёный исход (drop `validates`, выход за boundary, `source_conflict`, snapshot старше P01, разрыв `prev_hash`). YAML holdout не менялся, параметры под него не калибровались.
- E05a: выход за boundary всегда даёт непустой `known_unknowns` — на каталоге и инъекцией extra-node на intended мета-графе. Intended компилируется как стенд (крупнее среза); ground truth E02 на intended-узлах нет.
- Чистая логика: `recall.ts`, `freshness.ts` (`snapshotIsStale` в секундах с карточки P01), `verifyAuditChain` через `digestOf`. Шаг CI `correctness gate`. Команды `glt gate` нет.

### Notes

- INV-07 снят с отложения S-7. INV-04 перенесён на DEV-16: у шага нет UI. Usefulness gate остаётся «не проверено».
- Покрытие `glt_structural_coverage`: **0.675 (27/40)**.
- Шаг принят: `docs/DEV/12-correctness-gate.md` — `status: accepted`.

## [0.17.0] — 2026-09-10

DEV-11: инъекции S1–S3 в CI и открытый набор seeded changes с ручной ground truth.

### Added

- Каталог [`docs/EXPERIMENTS/seeded-changes.yaml`](docs/EXPERIMENTS/seeded-changes.yaml) v1.0.0: 13 случаев на срезе `glt.seeded-slice@1`, все восемь change classes и семь отношений со строкой в матрице, два выхода за boundary, один `uncovered_relation`.
- Инъекции S1–S3 автоматизированы: drop `validates` роняет gate, узел вне boundary даёт `known_unknowns`, дублирование владельца класса — verifier, код 6. Шаг CI `seeded failures`.
- Ground truth выведена по SPEC/impact.md и id рёбер/строк матрицы, не прогоном `computeImpact`. Независимое ревью при одном исполнителе невозможно: `independent_review.status: limitation-recorded`.

### Notes

- Набор не bootstrap-срез из четырёх узлов и не intended мета-граф: в registry нет `calls`/`reads`/`consumes`/`conflicts_with`. Holdout H01–H05 не открывался.
- Шаг принят: `docs/DEV/11-seeded-failure-tests.md` — `status: accepted`.

## [0.16.0] — 2026-09-09

DEV-10: `glt impact` — обход по propagation matrix, отчёт с `known_unknowns`.

### Added

- `glt impact` — change-impact по матрице, не по зашитым правилам. Check из `validates` идёт в `required_checks`, gate — в `release`, не в `affected_nodes`. Артефакт в stdout, в рабочую копию не пишет.
- Freeze golden `impact-bootstrap.json` совпадает с прогоном на golden snapshot. Отношение без строки матрицы — `known_unknowns.kind: uncovered_relation`. Выход за boundary — непустой `known_unknowns` (INV-05).
- LLM-метки не входят в `change.labels` и `release` (INV-12). Цикл топологии не зацикливает обход; цикл порядка исполнения — PROTO-07.
- Шаг CI `impact`. S-8 блокирующе: `impact.max_traversal_depth` только из `parameters/`.

### Notes

- PROTO-07, INV-05 и INV-12 сняты с отложения. Покрытие `glt_structural_coverage`: **0.65 (26/40)**.
- Шаг принят: `docs/DEV/10-impact-engine-v1.md` — `status: accepted`.

## [0.15.0] — 2026-09-09

DEV-09: заморозка golden digest компилятором и второй boundary intended мета-графа.

### Added

- Freeze-check: `isUnfrozenPlaceholder` отвергает `sha256:` + 64 нуля. Golden `bootstrap-snapshot.json` и `impact-bootstrap.json` пересчитаны `compileSnapshot`, не вписаны руками.
- Boundary `glt.controlplane-intended@1`: 11 компонентов (GLT-ID + SourceRef) и шаги DEV из frontmatter (`depends_on`, `status`, `expected_from_step`). Bootstrap-срез из четырёх узлов остаётся оракулом детерминизма.
- Шаг CI `compile intended snapshot`.

### Notes

- Правка `depends_on` в карточке DEV меняет граф без второй карты. Плановый шаг без кода не отказ: у него есть `expected_from_step`.
- Шаг принят: `docs/DEV/09-bootstrap-four-node-slice.md` — `status: accepted`.

## [0.14.0] — 2026-09-09

DEV-08: компилятор снимков. Канонизатор RFC 8785 с векторами; digest только через `digest.ts`.

### Added

- `glt compile snapshot` — полный Node/Edge, материализованные defaults (PROTO-04, PROTO-05), pin (PROTO-10). Артефакт в stdout, в рабочую копию не пишет.
- Векторы RFC 8785 §3.2.3 и Appendix B в `canonical.test.ts`. Массивы снимка сортируются до JCS: узлы/рёбра по `metadata.id`, assertions по `plane`, остальное лексикографически. NFC на alias.
- Digest = `digestOf(snapshot, "digest")`: член `digest` удаляется, не обнуляется. Снимок как вход компилятора — отказ (S-5).
- Шаг CI `compile snapshot`.

### Notes

- Golden `bootstrap-snapshot.json` остаётся с placeholder-digest: заморозка — DEV-09. Вписать хэш руками нельзя.
- PROTO-03, PROTO-05, PROTO-10 и INV-03 сняты с отложения S-7. Покрытие `glt_structural_coverage`: **0.575 (23/40)**.
- Шаг принят: `docs/DEV/08-snapshot-compiler.md` — `status: accepted`.

## [0.13.0] — 2026-09-09

DEV-07: резолвер SourceRef. `path` от корня репозитория, названного в `repository`, никогда от корня пакета.

### Added

- `glt resolve <ref>` — alias, node id или JSON SourceRef. Артефакт в stdout, в рабочую копию не пишет.
- `packages/domain/src/sourceref.ts` — selector `lines:N-M` и JSON Pointer (RFC 6901), pins для `role: evidence`, уникальный locator (PROTO-02). I/O — `packages/snapshot/src/resolve.ts`: `join(REPO_ROOT, path)`, без `PACK_ROOT`.
- Нет файла, чужой `repository`, несовпадение digest, evidence без `commit`+`digest` — код 5. Неоднозначный locator — код 3, не первый хит. Битый JSON SourceRef — код 2.
- Шаг CI `resolve sourceref`.

### Notes

- Две конвенции `docs/SPEC/...` и `glt-specpack/docs/...` резолвер не выбирает: это догадка, запрещённая тем же правилом, что PROTO-02. `docs/SPEC/registry.md` — код 5, даже если файл есть под `glt-specpack/`.
- Навигация без `commit`/`digest` разрешена; как evidence для approval/gate — нет.
- Шаг принят: `docs/DEV/07-sourceref-resolver.md` — `status: accepted`.

## [0.12.0] — 2026-09-09

DEV-06: компилятор реестра. Alias либо разрешается однозначно, либо ошибка.

### Added

- `glt compile registry` — schema-validate бандла и boundary, уникальный индекс `(alias, namespace, version)`, NFC. Артефакт в stdout, в рабочую копию не пишет.
- `resolveAlias` в `packages/domain/src/resolve.ts`. Неизвестный или неоднозначный alias — код 3, сообщение `unknown` / `ambiguous`, без догадки (PROTO-02, INV-02). Два id на один alias — PROTO-01. Переназначение внутри той же SemVer-строки — PROTO-08. Смена `spec` при том же revision — PROTO-09. Расхождение id с boundary — код 2.
- Шаг CI `compile registry`.

### Notes

- PROTO-01, PROTO-02, PROTO-08, PROTO-09 и INV-02 сняты с отложения S-7. Покрытие `glt_structural_coverage`: **0.475 (19/40)**. Негативно: синтетический бандл; живой YAML на диске не портится.
- Шаг принят: `docs/DEV/06-registry-compiler.md` — `status: accepted`.

## [0.11.0] — 2026-09-08

DEV-05: enforcement authority map. Sheet INV-01 — команда, а не договорённость.

### Added

- `glt lint authority` — один владелец на класс фактов, нормативный `owner` только из карты, один путь не принадлежит двум владельцам. Конфликт внутри класса — `source_conflict`, действия выше `read` блокируются; правило `registry_vs_engineering` победителя не выбирает. Код 6 ([runbook](docs/OBSERVABILITY/runbooks/authority-conflict.md)).
- `packages/domain/src/authority.ts` — чистая проверка. Разбор карты — один (`factClassesFromMap`); `lint docs` берёт множество owner оттуда же.
- Шаг CI `authority map`. Живая карта не правится: пересечение `registry/` у двух классов с одним owner и префикс vs узкий путь — не конфликт.

### Notes

- INV-01 снят с отложения S-7. Покрытие `glt_structural_coverage`: **0.35 (14/40)**. Негативно: синтетическая карта с двумя владельцами, неизвестный owner, путь у двух owner; живой YAML на диске не портится.
- Шаг принят: `docs/DEV/05-authority-map-enforcement.md` — `status: accepted`.

## [0.10.0] — 2026-09-08

DEV-04: валидатор JSON Schema, сверка S-7 и перепись механизмов S-4.

### Added

- `glt validate [path...]` — schema-validate реестра, boundary-манифеста, матрицы, реестра событий и фикстур. Без аргументов проверяет живой пакет (invalid-фикстуры не входят: они обязаны падать). Нарушение схемы — код 2. В артефакте печатается `glt_structural_coverage` **числом**.
- `boundary-manifest.schema.json` — у boundary не было своей схемы, а чеклист DEV-04 требует валидации «своей схемой». Подпись bootstrap-манифеста не трогали: новый файл не входит в `trusted_schemas`.
- S-7: сверка ID из трёх реестров с именами тестов. Отложенные ID перечислены в `structural-invariants.md` с шагом DEV и считаются непокрытыми. Нет теста у неотложенного ID — блокирующий отказ. Удаление ID из имени существующего теста роняет сверку.
- S-4: тест-перепись реестра механизмов в `AGENTS.md`; `createHash("sha256")` только в `domain/src/digest.ts`. Второй вызов вне этого файла роняет перепись.
- Загрузчик параметров: `domain/src/params.ts` (чистый разбор карточки) + чтение YAML в `contracts`.

### Notes

- Исходная линия S-7 была 0 из 40. Покрытие на этом шаге меньше 1.0: отложенные PROTO/INV волн 1–4 видны в отчёте. Молча выкинуть их из знаменателя нельзя.
- Негативно: invalid-фикстуры, второй `createHash("sha256")`, снятие `INV-10` из множества имён тестов.
- Шаг принят: `docs/DEV/04-json-schema-validator.md` — `status: accepted`.

## [0.9.0] — 2026-09-08

DEV-02: bootstrap verifier. Trust termination на T0, а не на ключе из проверяемого манифеста (sheet INV-10).

### Added

- `glt verify` — загружает `trust/seed-public-keys/*.pub` **до** разбора манифеста, затем проверяет Ed25519-подпись. Три отказа различимы по `refs[0]`: `missing-seed-key` (код 5), `bad-signature` (код 3), `embedded-key` (код 3). Последний — манифест, подписанный только ключом, который в нём же лежит: криптография могла бы сойтись, верификатор отказывается смотреть.
- `packages/domain`: канонизатор RFC 8785, digest `sha256:<hex>`, Ed25519. Все три без сторонних зависимостей: база доверия verifier не расширяется.
- `metadata.signature` у `trust/bootstrap-manifest.yaml`. Подпись снята с канонической формы перед проверкой. Ключ — опубликованный `glt-dev-only-2026`; `release-policy.yaml` по-прежнему отвергает его как release root.
- Шаг CI `bootstrap verifier`.

### Fixed

- Свежий клон: `pnpm install && pnpm verify` падал без ручного `pnpm gen`, потому что `@glt/contracts` реэкспортирует `generated/`, а тот каталог в gitignore. `preverify` гоняет генерацию, как `pretest`.

### Notes

- Схемы и golden digest команда на этом шаге не сверяет. Иначе unfrozen placeholder ронял бы свежий клон. Это DEV-04 и DEV-09.
- Негативно: пустой набор T0, подпись чужим ключом, манифест с встроенным ключом — три разных отказа, ни один не маскируется под другой.

## [0.8.0] — 2026-09-06

DEV-03: линтер метаданных и DAG. Проверка, которая до сих пор существовала
только как черновой скрипт вне репозитория, стала командой и шагом CI.

### Added

- `glt lint docs` — контракт метаданных, обеспеченный механизмом. 92 документа:
  наличие и разбираемость frontmatter, обязательные поля, уникальность `id`,
  разрешимость и ацикличность `depends_on`, разрешимость `spec_refs`,
  схема-валидность и **существование целей** `source_refs`, существование целей
  markdown-ссылок, `non_normative` для `examples/**`, owner из authority map.
- Шаг CI `docs metadata and DAG`. До него разрушенный документ уезжал в ветку
  незамеченным — что и произошло: markdown-форматтер превратил `id:` в заголовок
  и удалил закрывающий разделитель, документ выпал из графа, и три соседних шага
  получили висячий `depends_on`.
- `packages/domain/src/graph.ts` — чистые примитивы графа: поиск циклов с
  возвратом **полного пути**, висячие зависимости, дубли id. Путь возвращается
  целиком, потому что «spec.runner → spec.policy → spec.runner» можно чинить, а
  «где-то есть цикл» нельзя. Та же функция нужна обходу impact на DEV-10.
- `packages/contracts/src/pack-docs.ts` — чтение документов пакета и чистый
  разбор frontmatter, тестируемый напрямую на каждом способе поломки.

### Fixed

- Битая markdown-ссылка в `runbooks/authority-conflict.md`, найденная линтером
  на первом же запуске. Ни одна прежняя проверка её не видела: ссылки в теле
  документов не проверял никто.

### Notes

- Проверено негативно, пять случаев, все пойманы: разрушенный frontmatter, битая
  ссылка, несуществующий `spec_ref`, `source_ref` на перемещённый файл, цикл в
  `depends_on`.
- Линтер живёт в `cli` как композиционном корне: чтение файлов принадлежит
  `contracts`, алгоритм графа — `domain`, а связывание того и другого — команде.
  Заводить отдельный пакет под линтер значило бы расширить карту слоёв, а это
  решение архитектора, а не следствие задачи.
- **Ещё не в CI:** валидация схем и фикстур и сверка реестров инвариантов.
  Переезжают на DEV-04 вместе с `glt validate` и S-7.

## [0.7.0] — 2026-09-04

DEV-01 реализован в ветке `wave1`. Первый шаг, где спека встретилась с кодом, и
три места разошлись.

### Fixed — расхождения, найденные реализацией

- **`madge` был вторым механизмом на одну задачу.** Реестр механизмов называл
  `dependency-cruiser` для границ и `madge --circular` для циклов, но
  dependency-cruiser ловит циклы сам и при этом корректно разрешает TS-алиасы
  `@glt/*`, которых madge не видит. Два детектора одного класса дефектов — это
  нарушение S-4, и правило S-4 предписывает удалять старый механизм, а не
  добавлять второй. `madge` удалён, циклы ловит правило `s6-no-circular`.
- **S-2 требовал невозможного.** Формулировка запрещала `cli` импортировать
  `registry` напрямую, но команда `glt compile registry` обязана вызвать
  компилятор реестра, а фасадного пакета между ними нет. `cli` и `api`
  объявлены **композиционными корнями**: они связывают пакеты и не реализуют
  доменной логики. Для остальных пакетов правило «только ниже по списку»
  продолжает действовать без исключений.
- **S-3 и S-8 нельзя обеспечить eslint-правилом так, как было написано.**
  Линтер не знает множество допустимых имён событий; тест читает реестр и знает
  его точно. Оба инварианта обеспечиваются сканом источников, а не линтером —
  заодно у них появляются имена с ID, что нужно для сверки S-7.

### Added

- `control-plane/` — pnpm workspace: `contracts`, `domain`, `registry`,
  `snapshot`, `impact`, `cli`. TypeScript strict с `noUncheckedIndexedAccess` и
  `exactOptionalPropertyTypes`.
- Кодогенерация: 12 модулей типов из `contracts/schemas/` и 10 констант событий
  из реестра. Межсхемные `$ref` — абсолютные `https://glt.dev/schemas/...`,
  выведенные из `$id`; кодогенератор отображает их на диск собственным
  резолвером, чтобы сборка не зависела от живого домена.
- `.dependency-cruiser.cjs` — граф импортов объявлен **allowlist**, а не списком
  запретов: новое ребро требует правки конфига отдельным PR.
- Единый тип ошибки с `code`, `invariant`, `refs` и контрактом exit codes из
  `cli.md`. Единый писатель вывода: артефакт в stdout, диагностика в stderr.
- Поверхность CLI как данные, сверяемая с `cli.md` по равенству множеств.
  Ни один запрещённый глагол не существует как команда, подкоманда или флаг.
- CI: генерация, typecheck, тесты, границы; `knip` — предупреждением, S-9.

### Notes

- **Механизмы проверены негативно.** Шесть нарушений внесены намеренно — I/O в
  `domain`, импорт вверх по слоям, литерал имени события, магическое число,
  скрытая команда, дрейф `cli.md` — и каждое поймано. Первые две попытки
  негативного прогона были сломаны сами: инъекция не совпала по переводам строк
  и молча ничего не изменила, из-за чего прогон отрапортовал «не поймано» там,
  где ничего и не ломалось. В скрипт добавлена проверка, что мутация применилась.
- Команда, объявленная в `cli.md` но не реализованная в этой сборке, завершается
  кодом 1 и ничего не пишет в stdout. Ноль означает положительный результат, а
  не «команда существует».
- Генерируемые типы в `.gitignore`: они выводятся из пакета и не являются
  вторым представлением факта. Тест проверяет, что для каждой схемы есть модуль
  и лишних модулей нет.

## [0.6.0] — 2026-09-04

Концептуальные документы перенесены в `archive/`. Перенос сломал ссылки, и
обнаружилось, что проверка этого класса дефектов не ловила.

### Fixed

- **Проверка валидировала структуру SourceRef, но не существование цели.**
  Ссылка на перемещённый файл остаётся schema-valid и продолжает выглядеть
  авторитетной — то есть хуже сломанной по форме, потому что не выдаёт себя.
  Добавлена проверка существования каждого `path` относительно корня
  репозитория: и во frontmatter, и внутри данных (registry bundle, golden
  fixtures).
- **Перенос в `archive/` сломал 41 путь в 26 файлах**, и прогон 0.5.0
  отрапортовал зелёным. Пути исправлены на `archive/...`.
- **Две конвенции `path` сосуществовали в пакете:** `docs/SPEC/...` от корня
  пакета и `glt-specpack/docs/...` от корня репозитория. Resolver не может
  разрешить такую ссылку без догадки, а догадываться ему запрещено по PROTO-02.
  Принята единая конвенция — от корня репозитория, названного в `repository`.
- Три ссылки в `README.md` пакета указывали на перемещённые файлы.

### Added

- Существование `source_refs` — deliverable DEV-03; соблюдение конвенции пути —
  deliverable DEV-07.
- Правило выноса пакета: при переносе `glt-specpack/` в корень нового
  репозитория префикс `glt-specpack/` снимается со всех `path`. Забыть молча
  нельзя — проверка падает.
- **Негативное тестирование проверок.** Дефект вносится намеренно, прогон обязан
  упасть. Для этого случая проверено: возврат `path: GLT-2.0.md` вместо
  `archive/GLT-2.0.md` ловится, файл восстанавливается. Проверка, которая только
  когда-либо проходила, ничего не доказывает.

### Notes

Дефект того же класса, что и всё найденное волной 0: утверждение проверялось не
тем механизмом, которым выглядело проверяемым. Обнаружился при попытке добавить
проверку, а не при чтении документов.

## [0.5.0] — 2026-09-04

Разделение Product gate. Решение принято до волны 1, а не отложено до DEV-12:
DEV-12 входит в волну 1, и форма его критериев определяет, что строят DEV-09,
DEV-10 и DEV-11.

### Decisions

- **Product gate разделён на два.** GLT делает два разных утверждения:
  «считает правильно» и «ускоряет работу». Первое проверяется машинно одним
  человеком, второе — только людьми, которые графа не писали. В одном gate они
  делали его непроходимым, и он тихо превратился бы в формальность.
  - **Correctness gate** — DEV-12, блокирующий, полностью машинный.
  - **Usefulness gate** — отложен, статус **«не проверено»**: не `passed` и не
    `failed`. Отсутствие измерения не является ни успехом, ни провалом. Это тот
    же случай, для которого в GLT существует `unknown`, отличный от `healthy`.
- **B1 dashboard перенесён из волны 1 в DEV-20.** После разделения у него в
  волне 1 не осталось обоснования: Correctness gate машинный и UI не использует,
  Usefulness gate отложен. К DEV-20 существуют обе плоскости, и drift между
  ними — первое, что карта показывает, а CLI нет.

### Fixed

- **E02 не был машинно измеряем, хотя выглядел таким.** Формулировка
  «recall G ≥ B0 на ≥8/10 seeded cases» сравнивает GLT с человеком, вооружённым
  grep и памятью, то есть требует участника ровно как E01. Переписан как
  абсолютный `recall = 1.0` против авторизованной ground truth: и строже, чем
  «не хуже человека с grep», и не зависит от того, какой человек попался в
  baseline.
- **Recall и precision гейтились бы симметрично.** Теперь гейтится только
  recall, precision публикуется. Лишний узел в отчёте стоит разработчику
  времени на чтение; пропущенная обязательная проверка — это тот отказ, ради
  предотвращения которого GLT существует. Симметричный порог уравнял бы их.
- **Порог recall равен 1.0, а не 0.8.** Мягкий порог означает «иногда молча
  теряем обязательную проверку», что противоречит PROTO-12 и всей логике
  `known_unknowns`: неполнота обязана быть названной, а не статистической.
- **Seeded failures и seeded changes были одним набором.** У инъекции дефекта
  нет «набора затронутых узлов», поэтому recall на S1–S6 не считается — и
  Correctness gate было бы нечем измерять. Наборы разделены.
- **Recall на bootstrap-срезе бессмысленен:** на четырёх узлах и трёх рёбрах
  правильный ответ виден глазами, и метрика равна 1.0 у любой реализации,
  включая неправильную.

### Added

- Второй boundary `glt.controlplane-intended@1` (DEV-09) — полный intended
  мета-граф control plane. Чистые данные: intended-плоскость собирается из
  реестра и машиночитаемого frontmatter DEV, коллекторы не нужны, поэтому ничто
  из волны 2 не является предусловием.
- Критерий **E05a**: `known_unknowns` не пуст всегда, когда изменение выходит за
  boundary.
- Требования к набору seeded changes: ≥10 случаев, покрытие всех восьми change
  classes и всех покрытых матрицей отношений, ручной вывод ground truth,
  обязательное rationale со ссылками на id рёбер и строки матрицы, ревью ролью,
  не писавшей матрицу.

### Changed

- `docs/DEV/12-b1-dashboard-product-gate.md` → `12-correctness-gate.md`,
  `gate: product` → `gate: correctness`.
- DEV-20 получил B1 dashboard; глифы остаются заблокированы через E04.
- Рубрика B0/B1/G явно ограничена человеческими критериями и получила
  предусловия: ≥4 участника вне авторства графа, межсубъектный дизайн. Один
  человек не может пройти B0, B1 и G — проходя B0, он узнаёт ответы для G.
- `dashboard.md`: глифовый слой заблокирован бессрочно, и это намеренный исход, а
  не недосмотр — неизмеренный визуальный язык есть тот самый «секретный
  словарь», который GLT 2.0 отвергает.
- `value-economics.md`: экономические оценки помечены как оценки затрат, а не
  подтверждённая выгода.

### Notes

Пока Usefulness gate в статусе «не проверено», запрещено: расширять алфавит
глифов, утверждать в документации или презентациях, что GLT ускоряет работу,
приводить ROI-оценки, выдавать пройденный Correctness gate за доказательство
полезности.

## [0.4.0] — 2026-09-04

Три принятых решения и гигиена перед волной 1.

### Decisions

- **Контекст Observation разделён на Collection и Evaluation.** Он имел двух
  владельцев (`materialized-build` и `observed-runtime`) и давал цикл
  `Compilation ↔ Observation`: коллекторы подают факты в компилятор, а state
  evaluator потребляет снимок. Теперь восемь контекстов, ровно один владелец на
  каждый. Collection активируется с DEV-13, Evaluation с DEV-15.
- **Зафиксирована конвенция стрелки** в графе контекстов: `A --> B` читается как
  «B зависит от A». Без неё ацикличность непроверяема — именно поэтому цикл
  через Observation не заметили ни обзором, ни машинно. Поток audit-записей
  `Execution → Trust` объявлен потоком данных, а не зависимостью: иначе граф
  снова становится циклическим.
- **T0 — явно помеченный dev-only ключ.** Вместо нерабочей заглушки с невалидным
  base64 положен реальный Ed25519 `glt-dev-only-2026`, приватная половина
  которого выводится из опубликованного seed
  `sha256("glt-dev-only-2026")`. Ключ, чья приватная часть публична, не является
  секретом и не может случайно уехать в production — в отличие от заглушки,
  которую хочется «дозаполнить перед релизом». Верификатор при этом работает
  end-to-end уже на DEV-02.

### Fixed

- **`trusted_schemas` в bootstrap-манифесте перечисляли 4 схемы из 12.**
  `snapshot`, `registry-bundle` и `propagation-matrix` не были доверенными, хотя
  без них bootstrap-срез не компилируется. Добавлены `trusted_propagation_matrix`
  и `trusted_event_registry`; `min_version` реестра поднят до 0.2.0.
- **Третий список имён событий** в `docs/PDA/02-acts-of-certainty.md`, уже
  устаревший — в нём не было `glt.plan.created`. Проверка 0.3.0 смотрела только
  `events.md` и это место не поймала; теперь она обходит весь `docs/`. Ровно тот
  сценарий, о котором предупреждает патч: реестр перестаёт быть источником
  правды в момент появления первого дубля мимо него.
- `degradation.md` ссылался на «INV protocol #12» — приведено к `PROTO-12`.
- Несколько относительных ссылок в runbooks указывали не туда.

### Added

- **Тела шести runbooks.** Каждый: detect → mitigate → escalate → postmortem, с
  привязкой к инварианту и метрике. Ранее — заглушки «See runbooks-index.md».
- `release_trust_roots` в `release-policy.yaml`: `allowed` пуст, dev-only ключ в
  `forbidden` с причиной. Sealed release падает, пока настоящий T0 не добавлен.
- `placeholders_forbidden_at_release`: verifier digest, witness endpoint и
  all-zero digests фикстур перечислены как то, что обязано отсутствовать в
  релизе.
- `context` в схеме event registry расширен до восьми bounded contexts.

### Changed

- **Аудит PDA 01–05 проведён.** Из тринадцати пунктов выполнены двенадцать;
  каждая отметка сопровождается проверенным числом. Не выполнен один: «нет
  инварианта без механизма обеспечения» — 10 из 18 PROTO без sheet. Это
  единственный содержательный блокер шагов 1–5, и он закрывается по ходу волны 1
  под `glt_structural_coverage`, а не одним заходом.
- Пункт «граф ацикличен на уровне bounded contexts» отмечен — после разделения
  Observation и фиксации конвенции стрелки утверждение стало истинным.
- `03-domain-graph.md` больше не содержит открытого вопроса: граф контекстов
  финализирован.

### Notes

- **Измеримость Product gate (DEV-12) остаётся нерешённой** и записана в known
  gaps. Она не блокирует DEV-01. Критерий E01 требует ≥20% сокращения медианного
  времени до набора затронутых узлов, но на четырёх узлах grep не медленнее, а
  участников при одном исполнителе набрать негде. Вариант без людей: оставить
  блокирующими машинно измеримые E02 и E03 на закрытом holdout, а E01 и E04
  объявить непроверенными до появления реальных пользователей — то есть не
  выдавать отсутствие измерения за успешное измерение.
- Ключ `glt-root-2026.pub` удалён. `.gitignore` продолжает пропускать
  `seed-public-keys/*.pub` и блокировать любые `*.pem` и `*.key`.

## [0.3.0] — 2026-09-04

Принятие патча PDA v1.2 «Сцепка кодовой базы при параллельной разработке».
Методология пакета — v1.1 + патч v1.2.

Патч вводит класс **инвариантов сборки**: законы кодовой базы, отдельные от
законов домена. Их можно нарушить, соблюдая все инварианты протокола, и
получить две реализации digest при зелёных тестах.

### Fixed

- **Коллизия пространства имён `INV-`.** Два разных набора инвариантов делили
  нумерацию. `docs/SPEC/invariants.md` нёс 18 правил обычным списком,
  `docs/PDA/04-invariants.md` — 12 sheets `INV-01…12`; совпадал по смыслу только
  третий. `INV-04` означал «schema-valid node properties» и «inference ≠
  observation», `INV-05` — «materialized defaults» и «impact honesty», `INV-10` —
  «snapshot pinned to git SHA» и «bootstrap trust termination». Последний случай
  присутствовал в двух соседних файлах, написанных в 0.2.0.

  Разведение обязательно для S-7: сверка «инвариант ↔ тест» невозможна, пока
  один ID имеет два смысла.
- **Границы слоёв были прозой.** `architecture.md` перечислял «domain без I/O»,
  «runner не пишет в registry» без механизма обеспечения — то есть пожелание в
  терминах раздела 8 методологии.
- **`docs/SPEC/events.md` был вторым источником имён событий** рядом с кодом.
  Принцип «типы генерируются, не дублируются» был принят для схем в
  `normativity-rules.md`, но на события не распространён.
- **`docs/PDA/03-domain-graph.md` нёс собственную таблицу propagation**,
  расходящуюся с матрицей: направление обхода не совпадало, а классы `data` и
  `deploy` не существуют среди change classes.
- **Bootstrap-подграф в `03-domain-graph.md`** показывал направления рёбер до
  исправления 0.2.0.
- **У bounded contexts не были названы владельцы**, а у пар смежных контекстов —
  события на границе. Требование 9.8 к чеклисту 7.1.

### Added

- `docs/SPEC/structural-invariants.md` — реестр S-1…S-10 со sheets по шаблону
  9.7. Каждая запись имеет названный механизм, режим, пример нарушения и
  **легальные исключения**: инвариант сборки без описанного способа исключения
  либо будет обойден молча, либо остановит работу на первом оправданном случае.
- `AGENTS.md` в корне репозитория — карта слоёв, реестр механизмов, запреты,
  порядок работы, Definition of Done, стоп-условия. Снижает частоту нарушений;
  обнуляет её CI.
- `contracts/events/event-registry.yaml` и
  `contracts/schemas/event-registry.schema.json` — 10 событий с контекстом,
  actor, payload, idempotency key, связанными инвариантами, проекциями и
  `expected_from_step`. Событие без инварианта означает, что закрываемая
  неопределённость не сформулирована.
- `docs/00-governance/parallel-work.md` — деление по bounded context, владельцы,
  события на границах, зона архитектора, протокол расширения графа, метрика
  узкого места.
- Слой метрик «Сборка» в `OBSERVABILITY/metrics.md`.
- Классы фактов `event-registry` и `structural-invariants` в authority map.
- S-10 — инвариант, специфичный для GLT: множество команд CLI в точности равно
  списку из `cli.md`. Обещание «нет `commit`, `push`, `deploy`» до этого
  держалось на внимательности ревьюера.

### Changed

- 18 protocol rules получили ID `PROTO-01…PROTO-18` и карту в PDA sheets.
  Покрыто механизмом 8 из 18; остальные помечены как долг.
- Соглашение о ссылках: имя теста обязано содержать ID проверяемого инварианта
  в форме `PROTO-xx`, `INV-xx` или `S-x`.
- `SourceRef.authority` принимает `event-registry` и `structural-invariants`.
- `docs/SPEC/events.md` стал проекцией реестра и больше не определяет имена.
- DEV-01 получил механизмы S-1, S-2, S-3, S-6, S-10 и `AGENTS.md` как явные
  deliverables; DEV-04 — сверку S-7 и тест-перепись S-4.
- Чеклисты pre-code gate дополнены по 9.8. Пункты, требующие кода, намеренно
  **не** отмечены.
- `Possibility-Driven_Architecture_Methodology_ru_v1_1.docx.md` появился в
  репозитории — known gap 0.2.0 закрыт, ссылка из pre-code gate разрешается.

### Notes

- **Стартовый аудит П1:** 40 инвариантов в реестрах, 0 в тестах, 0 событий мимо
  реестра. Кода нет, поэтому `structural_coverage` = 0 — это база, к которой
  возвращаются.
- **Механизмы существуют как sheets, но не как конфиги.** Реестр заполнен;
  работающих проверок нет до DEV-01. Правило внесения соблюдено в части
  «механизм назван», но не в части «механизм работает» — это и есть содержание
  DEV-01.
- **Граница контекста Observation не разрешена.** Коллекторы подают факты в
  Compilation, state evaluator потребляет снимок из Compilation — единый
  Observation даёт цикл. Предложено разделение на Collection и Evaluation;
  решение принадлежит product-architecture. До решения контекст берёт одного
  исполнителя.
- Разделы 9.6 про деление по контекстам и метрика `graph_change_lead_time`
  зафиксированы, но не активны: волна 1 идёт одним исполнителем.

## [0.2.0] — 2026-09-04

Волна 0 — сверка контрактов. Пакет 0.1.0 был внутренне противоречив: DEV-06,
DEV-08 и DEV-09 не могли пройти по построению. Правки затрагивают контракты, а
не код; кода на момент ревизии не существует.

Ревизия ломающая для registry и wire-схем. Она безопасна только потому, что
`glt.bootstrap-slice@1` никогда не публиковался: пакет находился в статусе
pre-code, потребителей у схем не было. Поэтому `revision` boundary-манифеста
оставлен равным 1, а не увеличен.

### Fixed — контракты

- **Цикл в DAG документов.** `spec.runner → spec.policy → spec.runner`. В 0.1.0
  ацикличность была отмечена как PASS по ручному обзору, и обзор ошибся.
  `policy.md` теперь зависит от `spec.index`.
- **Id рёбер bootstrap-среза** расходились между `registry/glt-controlplane.yaml`
  (`glt.edge.check-validates-gate`) и golden snapshot (`glt.edge.check-gate`).
- **Направление рёбер** противоречило golden impact report и правилу обхода
  `depends_on` (обход идёт против ребра). Срез переориентирован:
  `compiler depends_on registry.entry`, `check validates compiler`,
  `gate.bootstrap gates check`.
- **`RegistryBundle` не валидировался ни одной схемой.** Inline-записи не
  проходили `registry-entry.schema.json` (нет `apiVersion`, `kind`,
  `metadata.namespace`), рёбра не проходили `edge.schema.json`.
- **Из `RegistryEntry` нельзя было получить `Node`.** Схема записи не могла
  выразить `type`, `lifecycle`, `owner`, `criticality`, обязательные для узла.
- **Канонизация JSON не была задана**, из-за чего PROTO-03 был нереализуем.
- **10 битых `spec_refs`** в DEV-02, 03, 11, 12, 24, 28, 30, 32, 34, 35.
- **6 runbooks без frontmatter** — не могли участвовать в DAG.
- **Owner `security` и `reliability`** отсутствовали в authority map;
  `approvals.md` заявлял `security` там, где authority map указывает
  `policy-engine`.
- **35 DEV-документов без обязательного `source_refs`**; `depends_on: [none]` в
  DEV-01; висячая зависимость на `glt.doc.experiments.holdout`.
- **`repository: aeon-profile` в 15 нормативных документах** при запрете
  `aeon.*` в authority map. Заменено на `glt-controlplane`; `authority` стал
  обязательным полем SourceRef.
- **Утечка шаблона `[\$(name)\]`** в 35 DEV-документах.

### Added

- `contracts/schemas/snapshot.schema.json` — снимок был центральным артефактом
  волны 1 без wire-контракта. `nodes[]` и `edges[]` несут полные объекты, а не
  список id, иначе PROTO-04 и PROTO-05 непроверяемы.
- `contracts/schemas/registry-bundle.schema.json` — бандл ссылается на
  канонические `RegistryEntry` и `Edge`, второго представления факта нет.
- `contracts/schemas/propagation-matrix.schema.json` и
  `contracts/propagation/propagation-matrix.yaml` — правила обхода как
  версионированные данные, matrix_version 1.0.0.
- `docs/SPEC/cli.md` — подкоманды, флаги, потоки, exit codes, требования
  детерминизма вывода.
- Класс фактов `impact-propagation-rules` (owner engineering), а также
  `security-controls` и `reliability-observability` в authority map.
- `node.schema.json#/$defs/{identity,declaration}` — одно определение,
  переиспользуемое `RegistryEntry.spec.node`.
- Фикстура `contracts/examples/invalid/edge-missing-propagation.json`.

### Changed

- `enum relation` расширен до 14 значений по GLT-2.0 §3.3: добавлены
  `consumes`, `builds`, `observes`, `gates`, `deployed_as`, `conflicts_with`.
  Отношения без строки в матрице перечислены в `uncovered_relations` и дают
  `known_unknowns`, а не молча пропускаются.
- `Edge.spec.assertions` и `spec.propagation` стали обязательными — так их и
  описывал `topology.md`.
- `SourceRef.authority` — обязательное поле; enum приведён к полному списку
  классов фактов из authority map.
- `ImpactReport` требует `snapshot_digest` и `change.matrix_version`, получил
  `release` (gate + state) и структурированные `known_unknowns` вместо строк.
- `Node.metadata` требует `namespace` и `title`; `aliases` остаются
  необязательными, поскольку глиф — псевдоним, а не адрес.
- Registry bundle версии 0.2.0.
- Golden фикстуры перегенерированы под новые контракты и приведены к
  каноническому порядку массивов.
- `boundary/node-minimal.json` сведён к действительно минимальному узлу.
- `validation-report.md` переписан: проверка стала машинной, а не ручной.

### Notes

- **Golden digests не заморожены.** `sha256:` + 64 нуля — зарезервированный
  placeholder. Реальные значения вычисляет компилятор на DEV-09, и freeze-check
  обязан отклонять placeholder. До DEV-09 golden не является оракулом
  детерминизма.
- Канонизация: RFC 8785 + сортировка неупорядоченных массивов + NFC. Реализация
  живёт в `packages/domain` без сторонних зависимостей, чтобы bootstrap verifier
  не расширял базу доверия (sheet INV-10).
- Проверки волны 0 становятся DEV-03, DEV-04 и DEV-05.

## [0.1.0] — 2026-08-14

### Added

- Standalone `glt-specpack/` для выноса в отдельный репозиторий.
- Governance: metadata-контракт, authority map, normativity rules, traceability, pre-code gate.
- PRODUCT: персона developer/architect, scope, Definition of Useful.
- PDA: восемь шагов (uncertainty → experiments).
- SPEC: декомпозированная инженерная спецификация GLT Control Plane.
- SECURITY: threat model, bootstrap trust, sandbox, external witness.
- OBSERVABILITY + EXPERIMENTS: метрики, runbooks, B0/B1/G rubric.
- contracts/: JSON Schema 2020-12 для Node, Edge, SourceRef, ImpactReport, ActionPlan.
- registry/: meta-registry `glt.controlplane.*`.
- parameters/: начальные parameter cards.
- trust/: authority map, bootstrap manifest, seed trust base.
- DEV: 35 зависимых шагов в четырёх волнах.
- examples/targets/aeon/: non_normative reference adopter.

### Notes

- v1: read-only/read-build runner; без self-write, commit, push, deploy.
- Исходная концепция: `GLT-2.0.md` (informative, вне пакета).
- ÆON не является нормативной зависимостью core.
