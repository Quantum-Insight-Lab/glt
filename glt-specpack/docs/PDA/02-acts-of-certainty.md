---
id: glt.doc.pda.acts
owner: product-architecture
normativity: normative
status: accepted
depends_on:
  - glt.doc.pda.uncertainty-map
source_refs: []
---

# PDA Step 2 — Акты определённости

Минимальные действия, создающие факты. v1 — без runner write.

---

## Acts для top uncertainties

| Uncertainty | Act | Факт | Evidence | Storage |
|---|---|---|---|---|
| U01 | Submit change descriptor (paths, diff stat) | change_event | git diff digest | impact input |
| U02 | Resolve alias → id@revision | resolve_result | registry lookup log | CLI/API response |
| U03 | Compile intended snapshot | topology_snapshot | source digests | snapshots/ |
| U04 | Run gate evaluation | gate_state | check reports | gate resource |
| U05 | Select seed node + incident class | propagation_request | user intent record | impact input |
| U06 | Pin as_of timestamp | snapshot_freshness | collector timestamps | node freshness axis |
| U07 | Compare two authoritative refs | conflict_record | both digests | node conflict axis |
| U08 | Request action plan | action_plan_draft | ActionSpec ids | plan envelope |
| U09 | Approve signed plan | approval_record | signature | audit chain |
| U10 | Append audit record | audit_entry | hash chain link | audit store |
| U11 | Declare boundary manifest | coverage_scope | manifest yaml | impact report |
| U12 | Classify change (deterministic) | change_labels[] | classifier version | impact input |
| U14 | LLM explain with refs | explanation_draft | node/edge ids cited | UI (non-normative) |
| U15 | External witness anchor | witness_receipt | third-party sig | trust/witness/ |

---

## Критерии качества act

- **Дешёвый:** ≤3 клика или одна CLI команда
- **Проверяемый:** fact имеет digest и source
- **Идемпотентный:** повтор не меняет normative state без новой revision
- **Без write v1:** acts не создают commit/deploy

---

## Запрещённые acts (v1)

| Act | Причина |
|---|---|
| Auto commit/push | Необратимо, вне v1 |
| LLM publish registry | Semantic drift |
| Dashboard manual status | Второй SoT |
| Self-approve release | Circular trust |

---

## Event naming

Имена событий здесь **не перечисляются**. Единственный источник —
[`../../contracts/events/event-registry.yaml`](../../contracts/events/event-registry.yaml);
типы генерируются из него, строковый литерал в коде является ошибкой сборки (S-3).

До 0.4.0 эта страница несла собственный список из девяти имён, и он успел
устареть: в нём отсутствовал `glt.plan.created`. Это ровно тот сценарий, о
котором предупреждает патч v1.2 — реестр перестаёт быть источником правды в
момент появления первого дубля мимо него.

Проекция каталога с контекстами и шагами: [`../SPEC/events.md`](../SPEC/events.md).
