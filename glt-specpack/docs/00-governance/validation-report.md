---
id: glt.doc.governance.validation-report
owner: governance
normativity: informative
status: accepted
depends_on:
  - glt.doc.dev.index
source_refs: []
---

# Specpack validation report — 0.6.0

Дата: 2026-09-04
Предыдущие ревизии: 0.5.0 (разделение gate), 0.4.0 (решения и гигиена), 0.3.0 (патч v1.2), 0.2.0 (сверка контрактов), 0.1.0 от 2026-08-14

## Как проверено

Волна 0 заменила ручной обзор машинной проверкой. Три прогона:

1. **Схемы и фикстуры** — все `contracts/schemas/*` компилируются в ajv 2020-12 в
   strict mode; каждая фикстура проверяется на ожидаемый исход (valid должна
   пройти, invalid должна упасть); референциальная целостность между бандлом,
   boundary-манифестом, golden snapshot, propagation matrix и event registry.
2. **Метаданные и DAG** — frontmatter каждого markdown в `docs/`, уникальность
   `id`, разрешимость `depends_on`, ацикличность, разрешимость `spec_refs`,
   валидность `source_refs[]` по `source-ref.schema.json`, owner из authority
   map, `examples/**` только `non_normative`.
3. **Реестры инвариантов** — полнота и непрерывность наборов `PROTO-xx`,
   `INV-xx`, `S-x`; отсутствие пересечения пространств имён; разрешимость
   ссылок PROTO → sheet и событие → инвариант; отсутствие неквалифицированных
   ссылок `INV-` в документах, владеющих PROTO-фактами; отсутствие имён событий
   вне реестра во всём `docs/`.

Проверяется **существование** цели каждого `path`, а не только форма ссылки —
и во frontmatter, и внутри данных.

Все три прогона зелёные: 92 документа, 0 циклов, 12 схем, 40 ID в реестрах.

Проверки прогоняются негативно: дефект вносится намеренно, и прогон обязан
упасть. Проверка, которая только когда-либо проходила, ничего не доказывает.

Эта логика становится DEV-03 (`glt lint docs`), DEV-04 (`glt validate`, S-7) и
DEV-05 (`glt lint authority`). До волны 0 она не существовала, поэтому
дефекты ниже жили в пакете незамеченными.

## Что нашла волна 0

Дефекты, которые сделали бы DEV-06/08/09 непроходимыми:

| # | Дефект | Исправление |
|---|---|---|
| 1 | Цикл в DAG документов: `spec.runner → spec.policy → spec.runner`. В 0.1.0 отмечен как PASS по ручному обзору | `policy.md` теперь зависит от `spec.index` |
| 2 | Id рёбер в registry и в golden snapshot не совпадали | Единый набор трёх id, сверяется машинно |
| 3 | Направление рёбер противоречило golden impact report и правилу обхода `depends_on` | Рёбра переориентированы; матрица задаёт направление явно |
| 4 | `RegistryBundle` не валидировался ни одной схемой; inline-записи не проходили `registry-entry.schema.json` | Добавлена `registry-bundle.schema.json`; бандл несёт канонические `RegistryEntry` и `Edge` |
| 5 | Из схема-валидного `RegistryEntry` нельзя было получить схема-валидный `Node` (нет `type`, `lifecycle`, `owner`, `criticality`) | `spec.node` через общий `node.schema.json#/$defs/declaration` |
| 6 | Схемы `snapshot` не существовало | Добавлена `snapshot.schema.json`; узлы и рёбра — полные объекты, а не список id |
| 7 | Канонизация JSON не задана, PROTO-03 нереализуем | RFC 8785 + правила сортировки в `snapshots.md` |
| 8 | Propagation matrix существовала только как форма записи | `contracts/propagation/propagation-matrix.yaml` + схема + класс фактов |
| 9 | `enum relation` неполон относительно GLT-2.0 §3.3 | 14 отношений; непокрытые матрицей дают `known_unknowns` |
| 10 | Поверхность CLI не определена | [`docs/SPEC/cli.md`](../SPEC/cli.md) |
| 11 | 10 битых `spec_refs` в DEV-02/03/11/12/24/28/30/32/34/35 | Пути исправлены, проверяются машинно |
| 12 | 6 runbooks без frontmatter — не могли участвовать в DAG | Frontmatter добавлен, `status: draft` |
| 13 | Owner `security` и `reliability` отсутствовали в authority map | Классы `security-controls` и `reliability-observability` |
| 14 | `approvals.md` заявлял owner `security`, authority map — `policy-engine` | Owner приведён к `policy-engine` |
| 15 | 35 DEV-документов без обязательного `source_refs` | Добавлено |
| 16 | `depends_on: [none]` в DEV-01, висячая зависимость на `glt.doc.experiments.holdout` | `[]`; holdout перенесён в `source_refs` |
| 17 | `repository: aeon-profile` в 15 нормативных документах при запрете `aeon.*` в authority map | `glt-controlplane` + обязательный `authority` |
| 18 | Утечка шаблона `[\$(name)\]` в 35 DEV-документах | Ссылки вычищены |

## Что принёс патч PDA v1.2

Патч добавляет класс **инвариантов сборки**: законы кодовой базы, отдельные от законов домена. Их можно нарушить, соблюдая все PROTO и INV, и получить две реализации digest при зелёных тестах.

| # | Дефект или пробел | Исправление |
|---|---|---|
| 19 | **Коллизия пространства имён `INV-`.** Два разных набора инвариантов делили нумерацию; совпадал по смыслу только третий. `INV-10` означал одновременно «снимок закреплён за git SHA» и «bootstrap trust termination», причём в соседних файлах, написанных на 0.2.0 | 18 protocol rules → `PROTO-01…18`; sheets остаются `INV-01…12`; инварианты сборки `S-1…10` |
| 20 | Границы слоёв из `architecture.md` описаны прозой — пожелание без механизма | S-1, S-2, S-5 с `dependency-cruiser`, блокирующе с DEV-01 |
| 21 | Нет Agent Rules File | [`AGENTS.md`](../../../AGENTS.md) в корне: карта слоёв, реестр механизмов, запреты, DoD, стоп-условия |
| 22 | `events.md` — каталог имён в прозе, то есть второй источник рядом с кодом | Event Registry как данные + генерация типов + запрет литералов (S-3); `events.md` стал проекцией |
| 23 | Нет слоя метрик «Сборка» | `structural_coverage`, `boundary_violations`, `duplicate_implementations`, `registry_drift`, `import_cycles`, `graph_change_lead_time` |
| 24 | У bounded contexts не названы владельцы; не названы события на границах | [`parallel-work.md`](parallel-work.md) + владельцы в `03-domain-graph.md` |
| 25 | `03-domain-graph.md` нёс собственную таблицу propagation, расходящуюся с матрицей (направление обхода, классы `data` и `deploy`, которых нет среди change classes) | Таблица заменена указателем на матрицу |
| 26 | Bootstrap-подграф в `03-domain-graph.md` показывал старые направления рёбер | Приведён к исправленному на 0.2.0 срезу |
| 27 | Обещание «нет `commit`/`push`/`deploy`» держалось на внимательности ревьюера | S-10: тест равенства множества команд списку из `cli.md` |

## Решения 0.4.0

| # | Вопрос | Решение |
|---|---|---|
| 28 | **Контекст Observation** имел двух владельцев и давал цикл `Compilation ↔ Observation`: коллекторы подают факты в компилятор, state evaluator потребляет снимок | Разделён на **Collection** (owner git-collector) и **Evaluation** (owner telemetry-collector). Восемь контекстов, ровно один владелец на каждый |
| 29 | **Конвенция стрелки в графе контекстов** не была задана, из-за чего цикл не обнаруживался ни обзором, ни машинно | `A --> B` читается как «B зависит от A». Audit-поток `Execution → Trust` объявлен потоком данных, а не зависимостью, иначе граф снова циклический |
| 30 | **T0-ключ** был нерабочей заглушкой с невалидным base64 | Реальный Ed25519 `glt-dev-only-2026` с **опубликованной** приватной половиной: `seed = sha256("glt-dev-only-2026")`. Ключ, чья приватная часть публична, невозможно случайно отправить в production, в отличие от заглушки, которую хочется «дозаполнить». Отвергается `release-policy.yaml` как release trust root |
| 31 | **`trusted_schemas` в bootstrap-манифесте** перечисляли 4 схемы из 12; snapshot, registry-bundle и матрица не были доверенными, хотя нужны bootstrap-срезу | Список дополнен; добавлены `trusted_propagation_matrix` и `trusted_event_registry` |
| 32 | **Третий список имён событий** в `PDA/02-acts-of-certainty.md`, уже устаревший — без `glt.plan.created`. Проверка 0.3.0 смотрела только `events.md` и это место не поймала | Список заменён ссылкой на реестр; проверка расширена на весь `docs/` |
| 33 | Тела шести runbooks были заглушками | Написаны: detect → mitigate → escalate → postmortem, с привязкой к инварианту и метрике |
| 34 | Содержательный аудит PDA 01–05 не проводился | Проведён. Из тринадцати пунктов выполнены двенадцать |

### Аудит PDA 01–05

Не выполнен ровно один пункт: **«нет инварианта без механизма обеспечения»** — 10 из 18 PROTO не имеют sheet. Остальное проверено по документам: 15 uncertainty cards с оценкой при пороге 15, top-5 отранжирован, non-goals явные; acts покрывают все top-5 с цепочкой факт → evidence → storage и явным списком запрещённых; восемь контекстов с одним владельцем каждый, Entity Dictionary из 14 сущностей, граф ацикличен; 12 invariant sheets при пороге 5, покрыты authority, audit, runner и self-hosting cycle; 7 parameter cards при пороге 3, у каждой обоснованный default, диапазон, риск обеих сторон и способ калибровки, product и reliability разделены.

## Стартовый аудит (П1 патча)

Проводится один раз перед внедрением. Наши цифры:

| Вопрос | Значение |
|---|---|
| Инвариантов сформулировано | 40 (18 PROTO + 12 INV sheets + 10 S) |
| Из них имеют механизм (sheet) | 8 из 18 PROTO |
| Из них имеют тест | 0 — кода нет |
| `event_type` в коде / в реестре | 0 / 10 |
| Импортов из домена в инфраструктуру | 0 — кода нет |
| Реализаций каждого механизма | 0 — кода нет |
| Среднее ожидание решения по домену | нет истории |

Одной строкой: **40 инвариантов в реестрах, 0 в тестах, 0 событий мимо реестра.**

Патч не преждевременен (порог П1 — не менее 5 инвариантов), и точка входа удачная: S-1, S-2, S-3, S-6, S-7 и S-10 включаются до появления кода, а не как долг.

## Checklist

| Check | Status |
|---|---|
| DAG docs acyclic (machine-checked) | PASS |
| Invariant namespaces disjoint (`PROTO` / `INV` / `S`) | PASS |
| PROTO → sheet references resolve | PASS |
| Event invariant references resolve | PASS |
| `events.md` introduces no name outside the registry | PASS |
| Structural invariant registry: every entry has a named mechanism | PASS |
| Doc ids unique, `depends_on` resolvable | PASS |
| `spec_refs` resolvable | PASS |
| `source_refs[]` schema-valid | PASS |
| Single owner per fact class (authority-map) | PASS |
| Normative owner present in authority map | PASS |
| JSON Schema 12 files, ajv strict, additionalProperties false | PASS |
| Fixtures: valid, invalid, boundary, golden behave as expected | PASS |
| Registry ↔ boundary ↔ snapshot ↔ matrix referential integrity | PASS |
| Bootstrap verifier independent of manifest key | PASS (spec + T0 README) |
| Threat T1–T10 documented | PASS |
| B0/B1/G rubric frozen | PASS |
| Holdout H01–H05 sealed | PASS |
| README + traceability | PASS |
| Portable repo bootstrap instructions | PASS |
| DEV 35 steps with depends_on | PASS |
| Parameter cards 7 | PASS |
| `aeon.*` absent in normative core | PASS |

## Known gaps (conditional PASS)

Осознанные и записанные, а не забытые.

- **T0 — dev-only.** `glt-dev-only-2026` рабочий, но его приватная половина
  опубликована. Production-ключ создаёт оператор; sealed release (DEV-35) падает,
  пока `release_trust_roots.allowed` пуст.
- **Verifier binary digest — placeholder**, заменяется на DEV-35.
- **Witness endpoint `example.invalid`**, реальный требуется с DEV-27.
- **DR multi-region** описан только как пробел в supply-chain, волна 4.
- **Golden digests не заморожены.** `bootstrap-snapshot.json` и
  `impact-bootstrap.json` несут зарезервированный placeholder `sha256:` + 64
  нуля. Реальные значения вычисляет компилятор на DEV-09; до этого golden не
  является оракулом детерминизма.
- **10 из 18 PROTO не имеют sheet**, то есть механизма и теста: PROTO-04, 05,
  06, 07, 08, 09, 10, 11, 12, 17. Это единственный невыполненный пункт аудита
  PDA 01–05 и долг по S-7 под метрикой `glt_structural_coverage`.
- **Механизмы S-1…S-10 существуют как sheets, но не как конфиги.** Реестр
  инвариантов сборки заполнен; работающих проверок нет до DEV-01 и DEV-04.
  Пункты чеклиста pre-code gate, требующие кода, намеренно не отмечены.
- **Usefulness не проверена.** E01 и E04 требуют ≥4 участников, не писавших
  граф. Статус — «не проверено», не `passed` и не `failed`. Пока он не изменён:
  алфавит глифов не расширяется, утверждения об ускорении работы не делаются,
  ROI не приводится. Correctness gate этого не заменяет — он доказывает
  корректность.
- **Набор seeded changes с ground truth не авторизован.** Требуется ≥10 случаев
  с ручным выводом правильного ответа, ревью роли, не писавшей матрицу.
  Авторизуется на DEV-11; без него Correctness gate измерять нечем.
- **Расширенный intended мета-граф не авторизован.** `glt.controlplane-intended@1`
  создаётся на DEV-09 как второй boundary. Это данные, коллекторы не нужны.

## Schema coverage

| Schema | valid | invalid | boundary | golden |
|---|:---:|:---:|:---:|:---:|
| registry-entry | ✓ | ✓ | — | — |
| registry-bundle | ✓ (сам бандл) | — | — | — |
| node | — | — | ✓ | in snapshot |
| edge | in bundle | ✓ | — | in snapshot |
| snapshot | — | — | — | ✓ |
| impact-report | — | ✓ | — | ✓ |
| propagation-matrix | ✓ (сама матрица) | — | — | — |
| event-registry | ✓ (сам реестр) | — | — | — |
| source-ref | in frontmatter | — | — | in snapshot |
| action-spec | — | — | — | — |
| action-plan | — | — | — | — |
| audit-record | — | — | — | — |

`action-spec`, `action-plan` и `audit-record` без фикстур: они относятся к волне 4
и покрываются на DEV-29…33.

## Решения 0.5.0 — разделение gate

| # | Вопрос | Решение |
|---|---|---|
| 35 | **Product gate был непроходим.** Половина критериев требовала участников эксперимента, которых при одном исполнителе взять негде; gate тихо стал бы формальностью | Разделён на **Correctness gate** (DEV-12, блокирующий, машинный) и **Usefulness gate** (отложен, статус «не проверено») |
| 36 | **E02 не был машинно измеряем**, хотя выглядел таким: «recall G ≥ B0» сравнивает с человеком, вооружённым grep и памятью, то есть требует участника ровно как E01 | Переписан как абсолютный `recall = 1.0` против авторизованной ground truth. Планка строже, чем «не хуже человека с grep», и не зависит от того, какой человек попался |
| 37 | Recall и precision гейтились бы симметрично | Гейтится только recall; precision публикуется. Лишний узел в отчёте стоит времени чтения, пропущенная обязательная проверка — это то, из-за чего GLT существует |
| 38 | **Recall на четырёх узлах равен 1.0 у любой реализации**, включая неправильную | Correctness gate измеряется на втором boundary `glt.controlplane-intended@1` — полном intended мета-графе. Bootstrap-срез остаётся оракулом детерминизма |
| 39 | **Seeded failures и seeded changes были одним набором.** У инъекции дефекта нет «набора затронутых узлов», поэтому recall на S1–S6 не считается | Два набора разделены. Ground truth выводится вручную по матрице: ответ, полученный измеряемым инструментом, — тавтология |
| 40 | **B1 dashboard в волне 1 потерял обоснование**: Correctness gate машинный и UI не использует, Usefulness gate отложен | Перенесён в DEV-20, где существуют обе плоскости и drift между ними видно. Глифы остаются заблокированы через E04 |

## Решения 0.6.0 — SourceRef

| # | Дефект | Исправление |
|---|---|---|
| 41 | **Проверка валидировала структуру SourceRef, но не существование цели.** Ссылка на перемещённый файл остаётся schema-valid и продолжает выглядеть авторитетной — то есть хуже, чем сломанная по форме | Проверка существования каждого `path` относительно корня репозитория, и во frontmatter, и внутри данных. Прогнан негативный тест: дефект воспроизведён, проверка его поймала |
| 42 | **Перенос концептуальных документов в `archive/` сломал 41 путь в 26 файлах**, и проверка 0.5.0 отрапортовала зелёным | Пути исправлены; дефект такого класса больше не проходит молча |
| 43 | **В пакете сосуществовали две конвенции `path`**: `docs/SPEC/...` (от корня пакета) и `glt-specpack/docs/...` (от корня репозитория). Resolver не может разрешить такую ссылку без догадки, а догадываться ему запрещено | Единая конвенция: `path` отсчитывается от корня репозитория, названного в `repository`. Вынос пакета в отдельный репозиторий требует снятия префикса `glt-specpack/`, и без этого проверка падает |

Дефект 41 — того же класса, что и всё, что нашла волна 0: утверждение
проверялось не тем механизмом, которым выглядело проверяемым. Он обнаружился
при попытке добавить проверку, а не при чтении.

## Pre-code gate

Governance-секция машинно проверена. Аудит PDA 01–05 проведён: двенадцать
пунктов из тринадцати выполнены, невыполнен «нет инварианта без механизма».
Исход — **PASS (conditional)** с записанными known gaps.

## Recommendation

Контракты консистентны и машинно проверяемы, гигиена закрыта, все решения
приняты. Открытых вопросов, требующих решения человека, не осталось.

Можно начинать DEV-01.
