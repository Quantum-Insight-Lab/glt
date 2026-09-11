---
id: glt.doc.spec.topology
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.provenance
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "sections:6.3-6.5"
    authority: engineering-contract
    role: informative
---

# Topology — Node и Edge

## Node (required)

- `metadata.id`, `metadata.revision`, `metadata.namespace`, `metadata.title`
- `spec.type`, `spec.lifecycle`
- `spec.owner`, `spec.criticality`

Optional: `metadata.aliases` (glyphs are aliases, never the canonical address), `spec.sensitivity`, `spec.sources[]` (SourceRef), `spec.capabilities[]`, `spec.signals[]`, `spec.delivery`.

Optional fields still get materialized into the snapshot — see [defaults](snapshots.md).

`spec.delivery` is computed from DevStep/Gate resources, never set by hand on the dashboard.

Checks **not** stored on Node — derived from incoming `validates` edges.

The Node declaration is authored once, in the registry entry (`spec.node`), and the snapshot compiler materializes it into a `kind: Node` object. Both share `node.schema.json#/$defs/declaration`, so there is one definition of the fact.

## Edge (required)

- `spec.from`, `spec.to`, `spec.relation`
- `spec.assertions[]` — one per plane, with evidence or explicit `null`
- `spec.propagation.change[]`, `spec.propagation.incident[]`

`declared`, `discovered`, `observed` and `inferred` are provenance classes, not confidence levels. One intended edge does not prove the same edge exists in build or runtime.

## Relations

Every edge is typed. `relation` is one of:

`depends_on`, `reads`, `writes`, `calls`, `emits`, `consumes`, `builds`, `validates`, `observes`, `gates`, `deployed_as`, `conflicts_with`, `hosts`, `owns`

Direction is read strictly as `from —relation→ to`. Which way impact travels is decided by the [propagation matrix](impact.md), not by the arrow:

- `A depends_on B` — a change to `B` reaches `A`, so traversal runs against the edge
- `CHECK validates TARGET` — a change to `TARGET` requires `CHECK`
- `GATE gates CHECK` — a required or failed `CHECK` moves `GATE` to pending or blocked

A relation with no matrix row is reported as a known unknown.

## State axes (independent)

```yaml
verification: unknown | pending | passed | failed | blocked
runtime: unknown | healthy | degraded | unhealthy | unreachable
freshness: current | drifted | stale
change: unchanged | modified | added | removed
activity: idle | active | waiting | retrying
coverage: unknown | partial | complete
delivery: planned | ready | in_progress | verified | blocked
conflict: none | source_conflict
```

Dashboard color = projection, not lossy single enum.

## State evaluator v1 (DEV-16)

`evaluateState` reads a snapshot and optional signals. It classifies each axis
independently. It does not create evidence, merge, or write the workspace.

| Axis | Missing signal |
|---|---|
| `verification` | `unknown` |
| `runtime` | `unknown` — never `healthy` (PROTO-12) |
| `freshness` | `stale` if age > P01 (`snapshotIsStale`); else `current` |
| `change` | `unchanged` until a change descriptor arrives |
| `coverage` | `unknown` |
| `delivery` | `declaration` from the snapshot, if present; else `planned` |
| `conflict` | `none` until two authorities disagree |

`evaluateState` also reports the DEV-17 ceiling from
[degradation.md](degradation.md): `write_blocked` and `actions_above: read`.
Stale snapshot or `source_conflict` blocks write/runner. Read stays allowed.
An aged runtime signal past P01 is dropped before it becomes a current
observation (PROTO-11). `glt health` warns on stderr when the snapshot is
stale; exit 6 when `conflict` is `source_conflict`.

Every axis value carries a provenance class from [provenance.md](provenance.md):
`declaration`, `discovery`, `observation`, `inference`. Computed axes are
`inference`. An inferred fact is never rewritten as `observation` (INV-04).

`glt health` emits the classification. Exit 0 requires a current snapshot, no
source conflict, and an **observed** healthy runtime. Absence of a runtime
signal is exit 5. `source_conflict` is exit 6.

## Schemas

- [`../../contracts/schemas/node.schema.json`](../../contracts/schemas/node.schema.json)
- [`../../contracts/schemas/edge.schema.json`](../../contracts/schemas/edge.schema.json)

## Fixtures

- Minimal Node: [`../../contracts/examples/boundary/node-minimal.json`](../../contracts/examples/boundary/node-minimal.json)
- Fully materialized bootstrap slice: [`../../contracts/examples/golden/bootstrap-snapshot.json`](../../contracts/examples/golden/bootstrap-snapshot.json)
