---
id: glt.doc.dev.index
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.index
source_refs: []
---

# DEV roadmap — 35 шагов

Четыре волны от статического верификатора до sealed release.

| Волна | Шаги | Тема |
|:---:|:---:|---|
| 1 | 01–12 | Статика и измерение, Correctness gate |
| 2 | 13–20 | Build-факты, коллекторы, B1 dashboard |
| 3 | 21–28 | Self-hosted runtime, witness |
| 4 | 29–35 | Runner, Safety gate, sealed release |

## Как принимать шаг

У каждого шага есть **чеклист приёмки**. Отмечать пункт можно только после того,
как он проверен своими руками. Непроверенный остаётся пустым.

Правило появилось не из педантизма: в версии 0.1.0 пункт «DAG документов
ацикличен» стоял отмеченным по ручному обзору, а в графе всё это время был цикл
`spec.runner → spec.policy → spec.runner`. Обзор ошибся, отметка соврала.
Поэтому у каждого чеклиста есть общий пункт «механизм проверен негативно»:
нарушение вносится намеренно, и прогон **обязан** упасть. Механизм, видевший
только чистый код, ничего не доказывает.

## Критический путь

Реальный путь по `depends_on` длиннее короткой записи: она пропускает 07 и 11.

```
01 → 04 → 06 → 07 → 08 → 09 → 10 → 11 → 12
02 → 05 параллельно после 01
```

## Gates

| Шаг | Gate |
|---|---|
| 12 | Correctness gate, машинно измеряемый |
| 28 | Anti-cycle acceptance |
| 32 | Safety prep |
| 35 | Safety gate и sealed release |

Usefulness gate (E01, E04) не привязан к шагу: он требует минимум четырёх
участников, не писавших граф, и до их появления имеет статус «не проверено».
См. [`../EXPERIMENTS/product-gate.md`](../EXPERIMENTS/product-gate.md).

## Машинные метаданные

Каждый `docs/DEV/NN-*.md` несёт YAML-frontmatter: `depends_on`, `spec_refs`,
`risk`, `gate`, `wave`. Frontmatter машиночитаем — его разбирают линтеры, и из
него же собирается intended-плоскость мета-графа на DEV-09. Править его руками
в отрыве от смысла шага нельзя.

## Прогресс

| # | Шаг | Волна | Риск | Статус |
|---|---|:---:|---|---|
| 01 | [Каркас репозитория](01-karkas-repozitoriya.md) | 1 | низкий | **сделано** |
| 02 | [Bootstrap verifier](02-bootstrap-verifier.md) | 1 | высокий | **сделано** |
| 03 | [Линтер метаданных и DAG](03-metadata-i-dag-linter.md) | 1 | средний | **сделано** |
| 04 | [Валидатор JSON Schema](04-json-schema-validator.md) | 1 | средний | запланирован |
| 05 | [Enforcement authority map](05-authority-map-enforcement.md) | 1 | высокий | запланирован |
| 06 | [Компилятор реестра](06-registry-compiler.md) | 1 | средний | запланирован |
| 07 | [Резолвер SourceRef](07-sourceref-resolver.md) | 1 | средний | запланирован |
| 08 | [Компилятор снимков](08-snapshot-compiler.md) | 1 | высокий | запланирован |
| 09 | [Bootstrap-срез из четырёх узлов](09-bootstrap-four-node-slice.md) | 1 | средний | запланирован |
| 10 | [Impact engine v1](10-impact-engine-v1.md) | 1 | высокий | запланирован |
| 11 | [Seeded-случаи](11-seeded-failure-tests.md) | 1 | средний | запланирован |
| 12 | [Correctness gate](12-correctness-gate.md) | 1 | средний | запланирован |
| 13 | [Git collector](13-git-collector.md) | 2 | средний | запланирован |
| 14 | [Collector CI-аттестаций](14-ci-attestations-collector.md) | 2 | средний | запланирован |
| 15 | [Связывание checks и gates](15-checks-and-gates-wiring.md) | 2 | средний | запланирован |
| 16 | [State evaluator](16-state-evaluator.md) | 2 | средний | запланирован |
| 17 | [Freshness и конфликты](17-freshness-and-conflicts.md) | 2 | высокий | запланирован |
| 18 | [Расширение build-плоскости](18-topology-expansion.md) | 2 | средний | запланирован |
| 19 | [Coverage manifest](19-coverage-manifest.md) | 2 | средний | запланирован |
| 20 | [Build-плоскость и B1 dashboard](20-build-plane-acceptance.md) | 2 | средний | запланирован |
| 21 | [API-сервис](21-api-service.md) | 3 | средний | запланирован |
| 22 | [Хранилище PostgreSQL](22-postgresql-storage.md) | 3 | средний | запланирован |
| 23 | [RBAC](23-rbac.md) | 3 | высокий | запланирован |
| 24 | [OTel и экспорт audit](24-otel-and-audit-export.md) | 3 | средний | запланирован |
| 25 | [Развёртывание через Compose](25-compose-deployment.md) | 3 | средний | запланирован |
| 26 | [Drift и инциденты](26-drift-and-incidents.md) | 3 | средний | запланирован |
| 27 | [Dogfood собственной топологии](27-self-topology-dogfood.md) | 3 | высокий | запланирован |
| 28 | [Интеграция внешнего witness](28-external-witness-integration.md) | 3 | высокий | запланирован |
| 29 | [ActionSpec и planner](29-actionspec-and-planner.md) | 4 | высокий | запланирован |
| 30 | [Брокер политики и подтверждений](30-policy-and-approval-broker.md) | 4 | высокий | запланирован |
| 31 | [Shadow runner](31-shadow-runner.md) | 4 | средний | запланирован |
| 32 | [Sandboxed read/build runner](32-sandboxed-read-build-runner.md) | 4 | критический | запланирован |
| 33 | [Receipts и reconciliation](33-receipts-and-reconciliation.md) | 4 | высокий | запланирован |
| 34 | [Supply chain и релиз](34-supply-chain-release.md) | 4 | высокий | запланирован |
| 35 | [Sealed acceptance и DR](35-sealed-acceptance-dr-doc.md) | 4 | средний | запланирован |

## Dogfooding

С DEV-27 GLT наблюдает собственный репозиторий через
`registry/glt-controlplane.yaml`.
