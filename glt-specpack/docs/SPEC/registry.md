---
id: glt.doc.spec.registry
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.index
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "sections:3.1,6.3"
    authority: engineering-contract
    role: informative
---

# Registry

## Resolve

```text
resolve(alias, namespace, registry_version)
  -> { semantic_id, revision } | error
```

- No implicit `latest` in plans/traces
- Unknown/ambiguous → error, never guess

## Registry entry fields

| Field | Required | Notes |
|---|:---:|---|
| `metadata.id` | ✓ | Stable, never reused |
| `metadata.revision` | ✓ | Monotonic per id |
| `metadata.namespace` | ✓ | e.g. `glt.controlplane` |
| `metadata.title` | ✓ | Human label |
| `metadata.aliases` | | Unicode NFC; glyphs optional |
| `spec.kind` | ✓ | node \| action \| gate \| check \| collector |
| `spec.node` | conditional | Required when `kind` is node, gate, check or collector |
| `spec.action_spec` | conditional | Required when `kind` is action |
| `spec.schema_ref` | | JSON Schema for payloads |
| `spec.description` | | |
| `spec.compatible_with` | | Explicit compat, not inferred |
| `spec.deprecated` | | With `replacement_id` |

`spec.kind` says what sort of registry object this is. `spec.node.type` says which topology class the node belongs to (`domain | service | tool | gate | check | infra`). Both are explicit: `kind: node` does not determine a type.

## Topology declaration

`spec.node` holds the GLT classification of the node — owner, criticality, sensitivity, lifecycle, capabilities, signals, delivery and the `sources[]` that point at the real source of truth. It uses the same definition as `Node.spec`, so the compiler materializes it without a second representation.

The registry stays authoritative only for GLT ids, aliases, SourceRefs, ActionSpec and policy metadata. It does not override a product or engineering contract; `sources[]` is how a node cites the contract that owns its meaning.

## Versioning rules

1. Semantic change → revision++
2. Registry bundle → SemVer
3. Alias reassignment forbidden in compatible registry version

## Bundle

A registry is stored as one `kind: RegistryBundle` document holding canonical `RegistryEntry` and `Edge` objects.

- Instance: [`../../registry/glt-controlplane.yaml`](../../registry/glt-controlplane.yaml)
- Schema: [`../../contracts/schemas/registry-bundle.schema.json`](../../contracts/schemas/registry-bundle.schema.json)

Bootstrap nodes:

- `glt.controlplane.registry.entry@1`
- `glt.controlplane.compiler@1`
- `glt.controlplane.check@1`
- `glt.controlplane.gate.bootstrap@1`

Bootstrap edges:

- `glt.edge.compiler-depends-registry`
- `glt.edge.check-validates-compiler`
- `glt.edge.gate-gates-check`

Boundary: [`../../registry/boundaries/bootstrap-slice.yaml`](../../registry/boundaries/bootstrap-slice.yaml). The boundary manifest and the bundle must list the same node and edge ids; the compiler fails on any divergence.

## Schema

[`../../contracts/schemas/registry-entry.schema.json`](../../contracts/schemas/registry-entry.schema.json)
