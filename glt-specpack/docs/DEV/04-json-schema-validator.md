---
id: glt.dev.04
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on:
  - glt.dev.01
spec_refs:
  - ../SPEC/registry.md
  - ../SPEC/topology.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
risk: medium
gate: none
source_refs: []
---

# 04 — JSON Schema validator

**Wave:** 1 · **Risk:** medium · **Gate:** none

## Outputs

- schema test suite
- S-7 invariant/test reconciliation: audit first, then blocking
- S-4 mechanism census

S-7 parses ids from three registries — `PROTO-xx`, `INV-xx`, `S-x` — and from
test names, then reports the gap as `glt_structural_coverage`. Baseline is 0 of
40: no code exists yet. An invariant belonging to an unimplemented wave is
marked deferred with its DEV step; deferred counts as uncovered and stays
visible, never silently skipped.

## Required evidence

- CI green on depends_on steps
- Spec refs implemented or explicitly deferred in CHANGELOG
- For gate steps: evidence per docs/EXPERIMENTS/

## SPEC

- [registry.md](../SPEC/registry.md)
- [topology.md](../SPEC/topology.md)
- [invariants.md](../SPEC/invariants.md)
- [structural-invariants.md](../SPEC/structural-invariants.md)


## Status

planned — generated with specpack 0.1.0
