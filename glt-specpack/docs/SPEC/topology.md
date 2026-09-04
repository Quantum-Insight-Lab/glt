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

## Schemas

- [`../../contracts/schemas/node.schema.json`](../../contracts/schemas/node.schema.json)
- [`../../contracts/schemas/edge.schema.json`](../../contracts/schemas/edge.schema.json)

## Fixtures

- Minimal Node: [`../../contracts/examples/boundary/node-minimal.json`](../../contracts/examples/boundary/node-minimal.json)
- Fully materialized bootstrap slice: [`../../contracts/examples/golden/bootstrap-snapshot.json`](../../contracts/examples/golden/bootstrap-snapshot.json)
