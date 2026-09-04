---
id: glt.dev.08
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on:
  - glt.dev.06
  - glt.dev.07
spec_refs:
  - ../SPEC/snapshots.md
risk: high
gate: none
source_refs: []
---

# 08 — Snapshot compiler

**Wave:** 1 · **Risk:** high · **Gate:** none

## Outputs

- bootstrap snapshot
- RFC 8785 canonicalizer with its own test vectors

PROTO-03 is only testable once the canonical form is implemented: sorted unordered
arrays, JCS serialization, NFC strings, digest over the document with the
`digest` member removed. The canonicalizer lives in `packages/domain` with no
third-party dependency, so the bootstrap verifier does not widen its trust base.

## Required evidence

- CI green on depends_on steps
- Spec refs implemented or explicitly deferred in CHANGELOG
- For gate steps: evidence per docs/EXPERIMENTS/

## SPEC

- [snapshots.md](../SPEC/snapshots.md)


## Status

planned — generated with specpack 0.1.0
