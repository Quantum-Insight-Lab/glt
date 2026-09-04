---
id: glt.dev.11
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on:
  - glt.dev.10
spec_refs:
  - ../EXPERIMENTS/seeded-failures.md
risk: medium
gate: product-prep
source_refs: []
---

# 11 — Seeded failure tests

**Wave:** 1 · **Risk:** medium · **Gate:** product-prep

## Outputs

- CI seeds S1-S3
- seeded change set with authored ground truth (≥10 cases)

## Two sets, not one

S1–S3 are defect injections: they check that a mechanism fires, and the outcome
is binary. Recall cannot be computed on them — an injection has no "set of
affected nodes".

The Correctness gate measures recall, so it needs the second set: changes
without defects, each carrying a hand-derived correct answer. Ground truth is
derived from the matrix and the graph **by hand**, never by running the impact
engine: an answer produced by the tool under measurement is a tautology, not a
ground truth.

Requirements, review rules and case format: [seeded-failures.md](../EXPERIMENTS/seeded-failures.md).

The set is reviewed by a role that did not author the propagation matrix. It is
open, unlike holdout H01–H05, and debugging the impact engine against it is
allowed.

## Required evidence

- CI green on depends_on steps
- Spec refs implemented or explicitly deferred in CHANGELOG
- For gate steps: evidence per docs/EXPERIMENTS/

## SPEC

- [seeded-failures.md](../EXPERIMENTS/seeded-failures.md)


## Status

planned — generated with specpack 0.1.0
