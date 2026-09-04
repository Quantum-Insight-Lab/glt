---
id: glt.dev.09
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on:
  - glt.dev.08
spec_refs:
  - ../SPEC/topology.md
risk: medium
gate: none
source_refs: []
---

# 09 — Bootstrap four-node slice

**Wave:** 1 · **Risk:** medium · **Gate:** none

## Outputs

- golden snapshot match
- frozen golden digests
- second boundary: full intended control-plane meta-graph

## Second boundary

`glt.bootstrap-slice@1` stays four nodes: it is the determinism oracle, and a
small fixed oracle is the point of it.

Measurement needs a different graph. On four nodes and three edges the correct
impact answer is visible by eye, so recall is 1.0 for any implementation
including a wrong one — the metric distinguishes nothing. The Correctness gate
therefore runs against a second boundary, `glt.controlplane-intended@1`: the
full meta-graph of the control plane — the eleven components, the DEV steps with
their dependencies, the checks and the gates.

This is **pure data authoring**. The intended plane comes from the registry and
from machine-readable DEV frontmatter; no collector is involved, so none of
wave 2 is a prerequisite. Only GLT ids and SourceRefs are written by hand — if
maintaining the map required re-annotating every step, the map would itself
become a second source of truth and the pilot would stop.

Both boundaries coexist. Golden determinism is checked on the slice, recall is
measured on the meta-graph.

Golden fixtures ship from the specpack with the reserved unfrozen placeholder
digest (`sha256:` + 64 zeros). This step recomputes them with the compiler and
freezes the result. The freeze check MUST reject a placeholder digest, so a
fixture that was never regenerated cannot pass as a determinism oracle.

Frozen here: `contracts/examples/golden/bootstrap-snapshot.json`
(`digest`, `source_digests`, `pinned_to.git_sha`) and
`contracts/examples/golden/impact-bootstrap.json` (`snapshot_digest`).

## Required evidence

- CI green on depends_on steps
- Spec refs implemented or explicitly deferred in CHANGELOG
- For gate steps: evidence per docs/EXPERIMENTS/

## SPEC

- [topology.md](../SPEC/topology.md)


## Status

planned — generated with specpack 0.1.0
