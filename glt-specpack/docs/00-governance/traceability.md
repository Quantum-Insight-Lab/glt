---
id: glt.doc.governance.traceability
owner: governance
normativity: informative
status: accepted
depends_on:
  - glt.doc.governance.metadata-contract
source_refs: []
---

# Traceability matrix

Связь PDA → SPEC → contract → DEV → evidence.

---

## PDA → SPEC

| PDA | Артефакт | SPEC |
|---|---|---|
| 01 uncertainty | `docs/PDA/01-uncertainty-map.md` | scope, degradation |
| 02 acts | `docs/PDA/02-acts-of-certainty.md` | collectors, gates |
| 03 domain graph | `docs/PDA/03-domain-graph.md` | architecture, registry |
| 04 invariants | `docs/PDA/04-invariants.md` | invariants.md, runner |
| 05 parameters | `docs/PDA/05-control-surfaces.md` | parameters.md |
| 06 blueprint | `docs/PDA/06-architectural-blueprint.md` | architecture.md |
| 07 observability | `docs/PDA/07-feedback-loops.md` | observability.md |
| 08 experiments | `docs/PDA/08-experiments.md` | experiments/* |

---

## SPEC → Schema

| SPEC | Schema |
|---|---|
| registry.md | `registry-entry.schema.json` |
| topology.md | `node.schema.json`, `edge.schema.json` |
| provenance.md | `source-ref.schema.json` |
| impact.md | `impact-report.schema.json` |
| runner.md | `action-plan.schema.json`, `action-spec.schema.json` |
| audit.md | `audit-record.schema.json` |

---

## SPEC → DEV (волны)

| Волна | DEV | SPEC refs |
|---|---|---|
| 1 Static | 01–12 | registry, topology, impact, dashboard |
| 2 Build | 13–20 | collectors, gates, freshness |
| 3 Runtime | 21–28 | service, witness, self-topology |
| 4 Runner | 29–35 | runner, sandbox, supply chain |

Полный индекс: [`docs/DEV/README.md`](../DEV/README.md).

---

## Evidence types per gate

| Gate | Required evidence |
|---|---|
| pre-code | PDA 01–05 complete, invariants sheets, param cards |
| Product | B1 dashboard task success ≥ baseline |
| Safety | threat scenarios 1–6 pass, no runner escape |
| sealed acceptance | holdout cases, external witness receipt |

---

## ID namespace

| Prefix | Назначение |
|---|---|
| `glt.doc.*` | Документы |
| `glt.controlplane.*` | Registry nodes GLT itself |
| `glt.schema.*` | JSON Schema $id |
| `glt.dev.*` | DEV steps |
| `glt.param.*` | Parameter cards |
| `glt.inv.*` | Invariant sheets |
