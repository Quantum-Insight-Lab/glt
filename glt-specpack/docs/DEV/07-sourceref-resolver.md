---
id: glt.dev.07
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on:
  - glt.dev.06
spec_refs:
  - ../SPEC/provenance.md
risk: medium
gate: none
source_refs: []
---

# 07 — SourceRef resolver

**Wave:** 1 · **Risk:** medium · **Gate:** none

## Outputs

- resolve refs CLI

## Path convention

`path` is resolved against the root of the repository named in `repository` —
never against the specpack root. Two conventions coexisted until 0.6.0
(`docs/SPEC/...` and `glt-specpack/docs/...`), and a resolver cannot
disambiguate them without guessing, which is exactly what a resolver must not
do.

Extraction of the specpack into its own repository root requires stripping the
`glt-specpack/` prefix. The existence check from DEV-03 fails if that step is
skipped, so it cannot pass silently.

## Required evidence

- CI green on depends_on steps
- Spec refs implemented or explicitly deferred in CHANGELOG
- For gate steps: evidence per docs/EXPERIMENTS/

## SPEC

- [provenance.md](../SPEC/provenance.md)


## Status

planned — generated with specpack 0.1.0
