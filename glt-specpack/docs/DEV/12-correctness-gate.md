---
id: glt.dev.12
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on:
  - glt.dev.10
  - glt.dev.11
spec_refs:
  - ../SPEC/impact.md
  - ../EXPERIMENTS/product-gate.md
risk: medium
gate: correctness
source_refs: []
---

# 12 — Correctness gate

**Wave:** 1 · **Risk:** medium · **Gate:** correctness

## Outputs

- E02a / E02b recall harness against the seeded change set
- E03 holdout runner for H01–H05
- E05a boundary honesty check
- gate evidence report: recall, precision, set size, classifier and matrix versions

## Criteria

Fully machine-measured. No criterion compares against a human baseline.

| Criterion | Threshold |
|---|---|
| E02a required-check recall | 1.0 |
| E02b affected-node recall | 1.0 |
| E03 false green on holdout | 0 |
| E05a `known_unknowns` non-empty outside boundary | always |

Recall is gated, precision is reported. An extra node in the report costs a
developer some reading; a missed required check is the failure GLT exists to
prevent. A symmetric threshold would treat those as equivalent.

Runs against `glt.controlplane-intended@1` (DEV-09), not against the four-node
slice: on four nodes recall is 1.0 for any implementation, correct or not.

## What this gate does not prove

It proves GLT computes correctly. It says nothing about whether GLT makes anyone
faster — that is the Usefulness gate, which is deferred with status **not
measured** because it needs at least four people who did not author the graph.

Passing this gate does not license claims about speed or productivity. See
[product-gate.md](../EXPERIMENTS/product-gate.md).

No UI is involved. The B1 dashboard moved to DEV-20, where both planes exist and
there is something worth showing.

## Required evidence

- CI green on depends_on steps
- Spec refs implemented or explicitly deferred in CHANGELOG
- Gate evidence per [docs/EXPERIMENTS/product-gate.md](../EXPERIMENTS/product-gate.md)

## SPEC

- [impact.md](../SPEC/impact.md)
- [product-gate.md](../EXPERIMENTS/product-gate.md)


## Status

planned
