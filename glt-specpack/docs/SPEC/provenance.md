---
id: glt.doc.spec.provenance
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.registry
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "section:6.2"
    authority: engineering-contract
    role: informative
---

# Provenance и SourceRef

## SourceRef

```yaml
source_ref:
  repository: glt-controlplane
  commit: "0123456789abcdef"
  path: glt-specpack/docs/SPEC/registry.md
  selector: "lines:10-40"   # or JSON Pointer / symbol
  digest: "sha256:..."
  authority: engineering-contract
  role: contract | canon | evidence
```

Navigation-only refs may omit `commit` and `digest`. Approval/gate evidence **must** include both.

## Provenance classes

| Class | Meaning | Display |
|---|---|---|
| `declaration` | Asserted in docs/registry | Intended plane |
| `discovery` | Found in code/infra | Materialized |
| `observation` | Live signal | Observed |
| `inference` | Computed | Must badge as inferred |

## Authority by fact class

See [`../../trust/authority-map.yaml`](../../trust/authority-map.yaml).

Conflict within same class → `conflict: source_conflict`, block actions > read.

## Planes

Each edge assertion is independent per plane: `intended`, `materialized`, `observed`.

## Privacy

Raw PII forbidden in topology and audit payloads. See [`../SECURITY/privacy.md`](../SECURITY/privacy.md).
