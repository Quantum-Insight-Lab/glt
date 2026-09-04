---
id: glt.dev.01
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on: []
spec_refs:
  - ../SPEC/architecture.md
  - ../SPEC/structural-invariants.md
  - ../SPEC/cli.md
risk: low
gate: none
source_refs: []
---

# 01 — Karkas repozitoriya

**Wave:** 1 · **Risk:** low · **Gate:** none

## Outputs

- repo skeleton
- CI
- structural invariant mechanisms S-1, S-2, S-3, S-6, S-10 — blocking from day one
- Agent Rules File (`AGENTS.md`) with mechanism registry and Definition of Done
- Event Registry codegen + string-literal ban
- S-8 in warning mode

Per patch v1.2 §9.11 the day-one set is boundary rules, event registry with
generated types, and the rules file. A structural invariant is admitted only
together with a working check, so these ship as configuration, not as prose:
`dependency-cruiser` (S-1, S-2, S-5), `madge --circular` (S-6), codegen plus
eslint literal rule (S-3), command-set equality test (S-10).

Sheets and rollout order: [structural-invariants.md](../SPEC/structural-invariants.md).

## Required evidence

- CI green on depends_on steps
- Spec refs implemented or explicitly deferred in CHANGELOG
- For gate steps: evidence per docs/EXPERIMENTS/

## SPEC

- [architecture.md](../SPEC/architecture.md)
- [structural-invariants.md](../SPEC/structural-invariants.md)
- [cli.md](../SPEC/cli.md)


## Status

planned — generated with specpack 0.1.0
