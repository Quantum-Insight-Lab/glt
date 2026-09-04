---
id: glt.doc.governance.normativity-rules
owner: governance
normativity: normative
status: accepted
depends_on:
  - glt.doc.governance.metadata-contract
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "sections:6.2,15"
    authority: engineering-contract
    role: informative
---

# Правила нормативности

Защита от круговой проверки, semantic drift и «dashboard theatre».

---

## Принцип single owner

Каждый **класс фактов** имеет ровно одного владельца — см. [`trust/authority-map.yaml`](../../trust/authority-map.yaml).

| Класс | Владелец | Не владелец |
|---|---|---|
| GLT ID, aliases, ActionSpec | registry | dashboard, LLM |
| Topology snapshot | snapshot-compiler | dashboard |
| Observed runtime | telemetry collectors | registry |
| Build/materialized | git/CI attestations | intended docs |
| Engineering decisions | docs/SPEC | registry |
| Audit chain | audit-store | Control Plane UI |
| Policy/approval | policy-engine | runner |

---

## Производные артефакты

Следующие **никогда** normative:

- dashboard projections;
- search indexes;
- compiled snapshots (кроме pinned release artifacts с подписью);
- impact reports (производны от snapshot + change class);
- LLM summaries;
- CLI pretty-print.

Они обязаны ссылаться на входные версии: `snapshot_id`, `registry_version`, `collector_digests`.

---

## JSON Schema как wire-контракт

- Единственный wire/storage-контракт: `contracts/schemas/*.schema.json`.
- TypeScript/Python типы **генерируются**, не дублируют schema вручную.
- `additionalProperties: false` на всех top-level objects v1.

---

## Anti-cycle правила self-hosting

1. **Bootstrap verifier** не доверяет public key из проверяемого manifest — только T0 seed.
2. **State Evaluator** не создаёт evidence; только читает и классифицирует.
3. **Control Plane** не выпускает и не одобряет собственный release.
4. **Runner** не валидирует собственный executor image без external witness.
5. **Registry compiler** не принимает generated snapshot как вход для той же revision.

---

## Конфликты источников

Если два authoritative источника одного класса расходятся:

```yaml
conflict: source_conflict
impact: coverage_not_established
actions_above: read  # blocked
```

Impact report обязан содержать `known_unknowns`, не пустой `unknown_edges: []`.

---

## LLM и normativity

LLM может:

- предлагать candidate labels и edges **для review**;
- объяснять blast radius по существующему графу.

LLM не может:

- публиковать registry entry;
- классифицировать change для release gate (только deterministic classifier);
- одобрять plan;
- скрывать `unknown`.

---

## ÆON и внешние adopters

- Поиск `aeon.*` в normative paths = дефект specpack.
- Reference adopters только в `examples/targets/*/`, `normativity: non_normative`.
- Adopter topology не обратно влияет на core schemas.
