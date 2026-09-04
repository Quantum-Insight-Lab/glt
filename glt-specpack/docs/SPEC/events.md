---
id: glt.doc.spec.events
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.index
  - glt.doc.spec.structural-invariants
source_refs: []
---

# Event Core

Append-only events for audit and projections.

## Source of truth

Names and payload shapes live in **one machine-readable file**:

- Instance: [`../../contracts/events/event-registry.yaml`](../../contracts/events/event-registry.yaml)
- Schema: [`../../contracts/schemas/event-registry.schema.json`](../../contracts/schemas/event-registry.schema.json)
- Fact class `event-registry`, owner engineering — see [`../../trust/authority-map.yaml`](../../trust/authority-map.yaml)

This document is a **projection** of that registry. It does not define event names. A catalog kept in prose becomes a second source the moment the first string literal appears in code, so the registry owns the names and this page explains them.

## Generation

1. Types and validators are **generated** from the registry into `packages/contracts`. Declaring an event type by hand is a build error.
2. A string literal event name in `emit` or `on` is a build error. Code uses generated constants only.
3. Adding an event is a separate PR, not mixed with feature work. Architect reviews.
4. Changing an existing event goes through `schema_version + 1`. Editing version 1 is forbidden — facts with that shape are already in the Event Core.
5. Every event names the invariants it relates to. An event with no invariant signals that the uncertainty it closes was never stated (PDA step 1).

Enforced by S-3 in [`structural-invariants.md`](structural-invariants.md), measured by `glt_registry_drift`.

## Catalog v1 (projection)

Ten events, grouped by bounded context. `expected_from_step` says when each one starts being emitted; nothing before DEV-08 emits anything.

| Event | Context | Actor | From step |
|---|---|---|---|
| `glt.change.submitted` | impact | user | DEV-10 |
| `glt.snapshot.compiled` | compilation | compiler | DEV-08 |
| `glt.impact.computed` | impact | engine | DEV-10 |
| `glt.gate.evaluated` | execution | engine | DEV-15 |
| `glt.plan.created` | execution | engine | DEV-29 |
| `glt.plan.approved` | execution | policy | DEV-30 |
| `glt.action.started` | execution | runner | DEV-31 |
| `glt.action.completed` | execution | runner | DEV-32 |
| `glt.audit.appended` | trust | system | DEV-24 |
| `glt.witness.anchored` | trust | witness | DEV-28 |

## Rules

- Immutable after append
- Correlation via opaque CP trace ID, never derived from user data
- `schema_version` in each event
- `idempotency_key` is an expression over payload fields. It does not prove the effect happened once: a lost receipt after an external write yields `unknown_outcome` and requires reconciliation, not retry.

## Storage

v1 uses audit JSONL plus optional Postgres. An event store may later back replay projections.
