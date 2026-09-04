---
id: glt.dev.20
owner: engineering
normativity: normative
status: planned
wave: 2
depends_on:
  - glt.dev.19
spec_refs:
  - ../SPEC/collectors.md
  - ../SPEC/dashboard.md
risk: medium
gate: none
source_refs: []
---

# 20 — Build plane acceptance + B1 dashboard

**Wave:** 2 · **Risk:** medium · **Gate:** none

## Outputs

- build overlay: Intended and Build planes in snapshot
- B1 dashboard, Change mode, read-only projection

## Why the dashboard lands here

It was a wave 1 deliverable until 0.5.0, justified by the Product gate. That
gate is now split: the Correctness gate (DEV-12) is machine-measured and does
not use a dashboard, and the Usefulness gate is deferred until at least four
people who did not author the graph are available.

Building a UI whose value cannot be measured, before correctness is proven on a
real-sized graph, is the "dashboard theatre" this pack argues against. By DEV-20
both planes exist, so the plane toggle `Intended / Build / Combined` has
something real to toggle between, and drift between the two is visible — which
is the first thing a map shows that a CLI does not.

Change mode only. Glyph layer stays blocked: it depends on E04, which belongs to
the deferred gate. Text labels and node ids are sufficient and are required
anyway by the accessibility rules in [dashboard.md](../SPEC/dashboard.md).

## Required evidence

- CI green on depends_on steps
- Spec refs implemented or explicitly deferred in CHANGELOG
- Read-only: dashboard writes nothing except action requests through the API (S-5)

## SPEC

- [collectors.md](../SPEC/collectors.md)
- [dashboard.md](../SPEC/dashboard.md)


## Status

planned
