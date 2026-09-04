---
id: glt.doc.spec.snapshots
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.topology
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "sections:3.2,5"
    authority: engineering-contract
    role: informative
---

# Snapshots

## Types (separate artifacts)

| Artifact | Mutable | Deterministic |
|---|---|:---:|
| Registry schema | versioned | ✓ |
| Topology snapshot | immutable per id | ✓ pinned |
| Observation stream | append-only | ✗ |
| Execution DAG | per plan | ✓ |
| Audit trace | append-only | hash chain |

## Snapshot identity

```yaml
snapshot_id: snap-20260814-abc123
as_of: 2026-08-14T10:00:00Z
registry_version: 0.2.0
boundary_id: glt.bootstrap-slice@1
config_profile: bootstrap
matrix_version: 1.0.0
pinned_to:
  git_sha: 0123456789abcdef
source_digests:
  registry: sha256:...
  boundary: sha256:...
collector_versions:
  intent: 1.0.0
  registry: 1.0.0
digest: sha256:...
```

Schema: [`../../contracts/schemas/snapshot.schema.json`](../../contracts/schemas/snapshot.schema.json).

`nodes[]` and `edges[]` carry **full** Node and Edge objects, not id references. A snapshot that only lists ids cannot satisfy PROTO-04 (schema-valid node properties) or PROTO-05 (materialized defaults).

## Materialized defaults

PROTO-05 requires every default to be explicit in the snapshot. The compiler materializes:

| Field | Default |
|---|---|
| `spec.sensitivity` | `internal` |
| `spec.capabilities` | `[]` |
| `spec.signals` | `[]` |
| `spec.delivery.status` | `planned` when `delivery` is present |

Registry entries may omit these; a snapshot may not.

## Canonical form

Determinism is defined against a single canonical form, not against file bytes.

1. **Array order is semantic in JSON**, so every unordered array is sorted ascending by Unicode code point before serialization:
   - `nodes[]` and `edges[]` by `metadata.id`;
   - `spec.assertions[]` by `plane`;
   - `spec.capabilities[]`, `spec.signals[]`, `spec.propagation.change[]`, `spec.propagation.incident[]` lexicographically;
   - `spec.sources[]` by the tuple `(repository, path, selector)`.
2. **Serialization** uses JSON Canonicalization Scheme, [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785): UTF-8, object members sorted by UTF-16 code unit, no insignificant whitespace, shortest round-tripping number form.
3. **Strings** are Unicode NFC normalized. This applies to glyph aliases in particular.

The canonicalizer lives in `packages/domain` with its own RFC 8785 test vectors. It has no third-party dependency, because the bootstrap verifier must not widen its trust base (sheet INV-10).

## Digest

```text
digest = "sha256:" + hex(sha256(JCS(snapshot without the "digest" member)))
```

The `digest` member is removed, not zeroed, before hashing. Stored snapshot files are pretty-printed for review; member order in the file is free because JCS re-sorts it. Array order is not free — see above.

`sha256:` followed by 64 zeros is the reserved **unfrozen placeholder**. It is schema-valid so fixtures stay loadable, and the DEV-09 freeze check MUST reject it. Golden fixtures ship unfrozen until DEV-09 computes and freezes real digests.

## Determinism

Same inputs → same digest. The pinned input set is exactly:

- `source_digests` of every input file;
- `registry_version` and `boundary_id`;
- `collector_versions` and `config_profile`;
- `matrix_version`;
- `as_of`.

Anything not in this list must not influence the output. Dynamic observations **do not** rewrite historical snapshots.

## Storage

- Wave 1: filesystem `snapshots/<snapshot_id>.json`
- Wave 3: PostgreSQL JSONB + content-addressed blob store

## Pinning for approval

Signed plan envelope includes `topology_snapshot_digest`.
