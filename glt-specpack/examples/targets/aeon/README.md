---
id: glt.doc.examples.aeon
owner: examples
normativity: non_normative
status: accepted
depends_on: []
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "section:11"
    authority: engineering-contract
    role: informative
---

# Reference adopter: ÆON (non_normative)

Пример применения GLT к другому проекту. **Не** входит в normative core specpack.

## Slice example

Four-node pilot from GLT 2.0 informative section:

```
CANON → TEXT → CHECK → GATE
```

IDs would use `aeon.*` namespace in adopter registry — **not** in `glt.controlplane.*`.

## Topology illustration

Adopter maintains separate registry file, e.g. `aeon-registry.yaml`, imported as target profile.

## Boundaries

- No `aeon.*` in `docs/SPEC/`, `contracts/`, `registry/glt-controlplane.yaml`
- Impact experiments for GLT product use bootstrap slice only
- ÆON DEV-27 steps may be mapped in adopter repo, not here

## Migration note

When extracting specpack to `glt-controlplane` repo, copy this folder only as optional example target.
