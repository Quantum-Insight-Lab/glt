---
id: glt.doc.governance.pre-code-gate
owner: governance
normativity: normative
status: accepted
depends_on:
  - glt.doc.governance.metadata-contract
  - glt.doc.pda.uncertainty-map
  - glt.doc.pda.acts
  - glt.doc.pda.domain-graph
  - glt.doc.pda.invariants
  - glt.doc.pda.control-surfaces
source_refs:
  - repository: glt-controlplane
    path: archive/Possibility-Driven_Architecture_Methodology_ru_v1_1.docx.md
    selector: "section:3,checklists"
    authority: methodology-pda
    role: informative
---

# Pre-code gate

Блокирует начало нормативной SPEC, JSON Schema и кода до закрытия шагов PDA 1–5.

---

## Чеклист (все пункты обязательны)

Аудит PDA 01–05 проведён 2026-09-04. Отметка ставится только там, где утверждение проверено по документу, а не выглядит правдоподобным.

### Шаг 1 — Uncertainty

- [x] ≥15 uncertainty cards с ценой ошибки и частотой — 15 в разделе A со `Error`, `Freq`, `Score`; ещё 10 в разделах B и C без оценки, потому что они не закрываются GLT
- [x] Ранжирование top-5 по `error_cost × frequency` — U01, U02, U04, U03, U05
- [x] Явные non-goals (что GLT не закрывает) — U16–U20 плюс отдельный список

### Шаг 2 — Acts

- [x] Каждая top uncertainty имеет дешёвый act — все пять top-5 покрыты
- [x] Act → создаваемый факт → evidence → storage — четыре колонки заполнены для 14 acts
- [x] Нет acts, требующих runner write — запрещённые acts перечислены явно

### Шаг 3 — Domain graph

- [x] Bounded contexts названы — восемь
- [x] У каждого контекста назван владелец — ровно один
- [x] Для каждой пары смежных контекстов названо событие на границе — [`parallel-work.md`](parallel-work.md)
- [x] Entity Dictionary ≥10 сущностей — 14
- [x] Edge types каталогизированы; propagation живёт в матрице, а не в прозе
- [x] Граф ацикличен на уровне bounded contexts — после разделения Observation на Collection и Evaluation и фиксации конвенции стрелки

### Шаг 4 — Invariants

- [x] ≥5 invariant sheets с mechanism + test + metric + runbook — 12
- [x] Покрыты: authority (INV-01), audit (INV-07), runner (INV-06), self-hosting cycle (INV-09)
- [ ] Нет инварианта без механизма обеспечения — **не выполнено**: 10 из 18 PROTO без sheet

### Шаг 5 — Parameters

- [x] ≥3 parameter cards без «случайных чисел» — 7, у каждой обоснование default
- [x] У каждой: default, range, risk обеих сторон, calibration
- [x] Product vs reliability constants разделены — P03 против P01, P04, P05, P06

### Инварианты сборки (патч v1.2, раздел 9.8)

- [x] Заведён реестр инвариантов сборки: [`../SPEC/structural-invariants.md`](../SPEC/structural-invariants.md)
- [x] Event Registry — единственный источник имён и схем событий
- [x] В репозитории есть Agent Rules File с реестром механизмов и Definition of Done
- [x] Пространства имён инвариантов разведены (`PROTO-xx`, `INV-xx`, `S-x`)
- [x] Введена метрика покрытия инвариантов механизмами
- [x] Определён порядок изменения общего ядра при нескольких исполнителях
- [ ] Каждая запись реестра имеет **работающую** проверку в CI — DEV-01
- [ ] Правила границ выполняются автоматически, а не на ревью — DEV-01
- [ ] Типы событий генерируются из реестра — DEV-01
- [ ] Каждый инвариант имеет тест со своим ID — DEV-04

Неотмеченные пункты требуют кода и закрываются на DEV-01 и DEV-04. Отмечать их до появления работающей проверки запрещено: это ровно тот антипаттерн, из-за которого «DAG ацикличен» был отмечен как пройденный при живом цикле.

### Governance

- [x] authority-map.yaml принят
- [x] metadata-contract принят
- [x] DAG документов ацикличен
- [x] examples/targets/* помечены non_normative

Эти четыре пункта проверяются машинно, а не обзором: `glt lint docs` и
`glt lint authority` (DEV-03, DEV-05). До волны 0 они были отмечены как
пройденные по ручному обзору, и обзор ошибся — в DAG был цикл
`glt.doc.spec.runner → glt.doc.spec.policy → glt.doc.spec.runner`. Ручной обзор
ацикличности больше не принимается как evidence.

Аудит PDA 01–05 проведён. Из тринадцати пунктов не выполнен один: «нет
инварианта без механизма обеспечения». Десять из восемнадцати PROTO не имеют
sheet, то есть механизма, теста и метрики. Это единственный содержательный
блокер шагов 1–5, и он закрывается по ходу волны 1 под метрикой
`glt_structural_coverage`, а не одним заходом.

---

## Решение gate

| Исход | Действие |
|---|---|
| **PASS** | Разрешены PDA 06–08, docs/SPEC/*, contracts/* |
| **CONDITIONAL** | PASS с записью `known_gaps` в decision log; gaps не блокируют bootstrap slice |
| **FAIL** | SPEC и schemas запрещены; только правки PDA 01–05 |

**Статус specpack 0.4.0:** PASS (conditional) — gaps: production T0 key, runtime witness, production DR, механизмы для 10 PROTO.

Волна 0 (сверка контрактов) выполнена после исходного решения gate и исправила
расхождения, которые блокировали DEV-06/08/09. См. [`validation-report.md`](validation-report.md)
и `CHANGELOG.md`.

---

## Anti-patterns (авто-FAIL)

- ER-диagram вместо domain graph на шаге 3
- Инварианты без тестов
- Parameter «потому что так удобнее»
- Начать UI/runner до Product/Safety gate freeze
- ÆON-специфика в normative core

---

## После gate

1. Зафиксировать `docs/PDA/06-architectural-blueprint.md`
2. Разложить `docs/SPEC/*`
3. Опубликовать JSON Schemas
4. Старт DEV-01
