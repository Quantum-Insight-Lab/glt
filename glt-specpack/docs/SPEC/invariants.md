---
id: glt.doc.spec.invariants
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.pda.invariants
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "section:5"
    authority: engineering-contract
    role: informative
---

# Protocol invariants (18)

Машинно проверяемые правила протокола GLT 2.0.

## Пространства имён

В пакете два набора инвариантов, и они больше не делят нумерацию:

| Префикс | Набор | Что описывает | Владелец |
|---|---|---|---|
| `PROTO-xx` | 18 правил здесь | **что** обязано быть истинно в протоколе | engineering |
| `INV-xx` | 12 sheets в [`../PDA/04-invariants.md`](../PDA/04-invariants.md) | что + mechanism + test + metric + runbook | product-architecture |
| `S-x` | 9 правил в [`structural-invariants.md`](structural-invariants.md) | законы кодовой базы, не домена | engineering |

До версии 0.3.0 оба набора использовали `INV-xx`, и совпадал по смыслу только третий. Ссылка `INV-10` означала одновременно «снимок закреплён за git SHA» и «bootstrap trust termination». Разведение обязательно для S-7: сверка «инвариант ↔ тест» невозможна, пока один ID имеет два смысла.

Соглашение о ссылках: имя теста обязано содержать ID того инварианта, который он проверяет, в форме `PROTO-xx`, `INV-xx` или `S-x`. Сверка — S-7.

## Правила

| ID | Правило | Sheet |
|---|---|---|
| PROTO-01 | One `(alias, namespace, registry_version)` → max one semantic ID | [INV-02](../PDA/04-invariants.md) |
| PROTO-02 | Unknown/ambiguous alias → error, never execute | [INV-02](../PDA/04-invariants.md) |
| PROTO-03 | Pinned inputs → identical topology snapshot digest | [INV-03](../PDA/04-invariants.md) |
| PROTO-04 | Every node: stable ID, kind, schema-valid properties | — |
| PROTO-05 | All defaults materialized in snapshot | — |
| PROTO-06 | Every edge: type, source, evidence level per plane | — |
| PROTO-07 | Execution graph acyclic | — |
| PROTO-08 | No alias reassignment in compatible registry version | — |
| PROTO-09 | Semantic change → new revision | — |
| PROTO-10 | Each snapshot pinned to git SHA, artifact digest, or deployment ID | — |
| PROTO-11 | Expired signal excluded from current health calculation | — |
| PROTO-12 | Missing signal ≠ `healthy` | — |
| PROTO-13 | LLM cannot add unknown action ID or capability | [INV-06](../PDA/04-invariants.md) |
| PROTO-14 | Action plan in signed envelope with all digests | [INV-08](../PDA/04-invariants.md) |
| PROTO-15 | Envelope field change → approval invalidated; policy re-checked at run | [INV-08](../PDA/04-invariants.md) |
| PROTO-16 | No external effect without tamper-evident audit + pre-effect attempt record | [INV-07](../PDA/04-invariants.md) |
| PROTO-17 | commit, push, migration, deploy — separate actions, separate approvals | — |
| PROTO-18 | Raw PII not in topology graph or CP traces | [INV-11](../PDA/04-invariants.md) |

## Долг по механизмам

Sheet содержит mechanism, test, metric и runbook. Правило без sheet — это формулировка без механизма обеспечения, то есть пожелание в терминах раздела 8 методологии.

**Покрыто: 8 из 18.** Без sheet: PROTO-04, 05, 06, 07, 08, 09, 10, 11, 12, 17.

Это исходная точка метрики `structural_coverage` ([`../OBSERVABILITY/metrics.md`](../OBSERVABILITY/metrics.md)). Целевое значение 100%; разрыв закрывается по мере реализации волны 1, а не одним заходом. Правило внесения то же, что у инвариантов сборки: sheet принимается только вместе с работающей проверкой.

Пять sheets не имеют парного protocol rule, потому что описывают инварианты самого пакета, а не протокола GLT: INV-01 (single authority per fact class), INV-04 (inference ≠ observation), INV-05 (impact honesty), INV-09 (no self-approval cycle), INV-10 (bootstrap trust termination).

## CI

Bootstrap verifier прогоняет golden fixtures и invariant suite на каждом PR (DEV-02, DEV-04). Сверка «каждый инвариант имеет тест со своим ID» — S-7, блокирующе с DEV-04.
