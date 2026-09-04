---
id: glt.doc.spec.impact
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.topology
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "section:8"
    authority: engineering-contract
    role: informative
---

# Impact Engine

## Modes

1. **change-impact** — deterministic change classification → traversal
2. **incident-propagation** — seed node + incident class → traversal

Separate matrices; do not mix availability_failure with schema change.

## Change classification

- **Deterministic classifier** (versioned) for gating
- Multi-label: one change may carry several classes
- Ambiguous classification → conservative union of rules, or block the high-risk plan
- LLM → candidate labels for **review only**

## Propagation matrix

Traversal rules are data, not code:

- Instance: [`../../contracts/propagation/propagation-matrix.yaml`](../../contracts/propagation/propagation-matrix.yaml)
- Schema: [`../../contracts/schemas/propagation-matrix.schema.json`](../../contracts/schemas/propagation-matrix.schema.json)
- Fact class `impact-propagation-rules`, owner `engineering` — see [`../../trust/authority-map.yaml`](../../trust/authority-map.yaml)

One row keys on `(mode, relation, changed_endpoint, class)` and yields `direction`, `edge_filter`, `effects` and `stop`:

```text
(relation, changed_endpoint, class) → direction | edge_filter | effects | stop
```

- `direction: against_edge` — `A depends_on B`, a change to `B` reaches `A`
- `direction: none` — the rule emits effects but does not continue the walk
- `edge_filter: propagation.change` — the class must also be declared on the edge, which is what keeps a content change out of an interface-only edge
- `effects: require_check` — the check goes to `required_checks`, never to `affected_nodes`
- `effects: gate_pending` — the gate goes to `release`, never to `affected_nodes`
- `effects: conflict_check` — `conflicts_with` raises a conflict check instead of propagating

Traversal walks `(node_id, class)` states with a visited set. A cycle in topology is allowed; a cycle in execution order is not.

Parameters: `impact.max_traversal_depth` (default 8).

## Uncovered relations

`spec.uncovered_relations` lists relations with no row in the current matrix version. An edge carrying one of them produces a `known_unknowns` entry of kind `uncovered_relation`. It is never silently skipped — a missing edge cannot be discovered from the graph itself, so incompleteness must be reported rather than inferred away.

## Impact report (required fields)

```yaml
report_id: imp-...
snapshot_id: snap-...
snapshot_digest: sha256:...
boundary_id: glt.bootstrap-slice@1
mode: change
change:
  classifier_version: 1.0.0
  matrix_version: 1.0.0
  labels: [interface, schema]
affected_nodes: [...]
candidate_paths: [...]        # not causal claims
required_checks: [...]
known_unknowns: [...]         # mandatory outside boundary
release:
  gate: glt.controlplane.gate.bootstrap
  state: pending
coverage_not_established: false
```

The report is a derived projection and must pin every input version it was computed from: snapshot id **and** digest, classifier version, matrix version.

**Forbidden:** empty `known_unknowns` when the change touches anything outside the boundary or an uncovered relation.

## Language

Use «path of possible spread», «candidate source». Causality requires trace-parentage or explicit causal evidence.

## Schema

[`../../contracts/schemas/impact-report.schema.json`](../../contracts/schemas/impact-report.schema.json)

## Golden cases

[`../../contracts/examples/golden/impact-bootstrap.json`](../../contracts/examples/golden/impact-bootstrap.json)

The bootstrap golden case walks an `interface` change of `docs/SPEC/registry.md`:

```text
registry.entry            (direct, source mapped)
  --depends_on(against)-> compiler            affected
  --validates(to)------->  check              required_checks
  --gates(to)----------->  gate.bootstrap     release.state = pending
```
