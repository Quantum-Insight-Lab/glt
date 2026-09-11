---
id: glt.doc.spec.gates
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.topology
source_refs: []
---

# Gates и Checks

## Check

Validates a node or contract. State:

```yaml
CheckState: unknown | pending | passed | failed
```

Registered as node `kind: check` with `validates` edge to target.

## Gate

Aggregates checks + policy. State:

```yaml
GateState: unknown | open | pending | passed | failed | blocked
```

## Delivery linkage

Node `delivery.status` computed from DevStep/Gate resources:

`planned | ready | in_progress | verified | blocked`

Transitions require evidence: closed gate, check report, or explicit block record.

## Bootstrap gate

`glt.controlplane.gate.bootstrap@1`:

- schema validate registry
- compile bootstrap snapshot
- run invariant tests on golden fixtures
- DAG acyclicity check on docs

## v1

Gates are **read/evaluate only** — no auto-merge.

## Gate evaluation v1 (DEV-15)

`evaluateGate` reads the `gates` edges and check signals. It computes `GateState`. It does not merge, release or write the workspace.

| Input | Effect |
|---|---|
| Required gated check with no signal | `unknown` — missing ≠ `passed` (PROTO-12) |
| Required gated check `pending` | `pending` |
| Failed gated check | `blocked` |
| Explicit block record | `blocked` |
| Every required gated check `passed`, none failed | `passed` |
| No required checks, none failed | `open` |

A required check that is not gated by this gate is `known_unknowns`, not a silent skip.

Every result carries evidence: `closed_gate`, `check_report`, or `explicit_block`. LLM labels are review-only and never become gate input (INV-12).

The result holds the payload fields of `glt.gate.evaluated` (`gate_id`, `state`, `snapshot_digest`). Append to the event store is DEV-24. The evaluator is not a `glt` command (`glt health` is DEV-16).
