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
