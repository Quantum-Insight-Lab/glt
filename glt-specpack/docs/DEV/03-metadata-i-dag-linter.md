---
id: glt.dev.03
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on:
  - glt.dev.01
spec_refs:
  - ../00-governance/metadata-contract.md
risk: medium
gate: pre-code
source_refs: []
---

# 03 — Metadata i DAG linter

**Wave:** 1 · **Risk:** medium · **Gate:** pre-code

## Outputs

- doc DAG check
- `source_refs` existence check

## Existence, not just structure

Validating a SourceRef against its schema proves the shape, not the target. A
ref to a moved file stays schema-valid and keeps looking authoritative, which
makes it worse than a malformed one.

This gap was real: moving the concept documents into `archive/` broke 41 paths
across 26 files, and the 0.5.0 checker reported green because it only validated
structure. The linter must resolve every `path` against the repository root and
fail on anything missing.

Same rule for SourceRefs inside data artifacts — registry bundle, golden
fixtures — not only in frontmatter.

## Required evidence

- CI green on depends_on steps
- Spec refs implemented or explicitly deferred in CHANGELOG
- For gate steps: evidence per docs/EXPERIMENTS/

## SPEC

- [metadata-contract.md](../00-governance/metadata-contract.md)


## Status

planned — generated with specpack 0.1.0
