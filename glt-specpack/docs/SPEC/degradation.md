---
id: glt.doc.spec.degradation
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.self-hosting
source_refs: []
---

# Degradation modes

| Condition | Behavior |
|---|---|
| Stale snapshot (> P01) | Warn; block write/runner |
| Witness stale (> P06) | Read-only mode |
| Audit verify fail | Stop runner; alert |
| Collector partial failure | `coverage: partial`, list known_unknowns |
| Registry conflict | `source_conflict`, block > read |
| CP component down | CLI static fallback if snapshots local |
| Classifier low confidence | Gate pending, not pass |
| unknown_outcome | Reconcile runbook, no auto-retry |

## Freshness and conflicts (DEV-17)

`assessDegradation` is the ceiling. It does not invent evidence and does not
pick a winner.

| Input | Read | Write | Runner | Exit from `glt health` |
|---|---|---|---|---|
| Current snapshot, no conflict | allowed | allowed | allowed | 0 if runtime is an **observed** healthy; else 5 |
| Snapshot age > P01 (`snapshotIsStale`) | allowed | blocked | blocked | 5; warn on stderr |
| Same fact class, two digests | allowed | blocked | blocked | 6; `conflict: source_conflict` |

P01 is `glt.param.snapshot.stale_after_seconds` from the parameter card. The
number does not live in `domain` (S-8). Age vs limit uses `snapshotIsStale`
(S-4): one stale predicate, not a second clock.

A signal whose age is past that same limit is dropped before it enters a
current health calculation (PROTO-11). Historical facts may stay; the current
projection is empty. Absence after the drop is `unknown`, never `healthy`
(PROTO-12).

`detectFactConflict` compares digests of one fact class. Agreement is `none`.
Disagreement is `source_conflict`. The function names the conflict and the
refs; it does not choose which digest is true. That is a different task from
INV-01 (two owners of one class).

v1 has no write command. The write/runner block is still a required
predicate: a stale or conflicted snapshot must report `write_blocked: true`
and `actions_above: read`.

## Graceful UI

Always show: snapshot age, boundary id, classifier version, known_unknowns count.

Never imply health from absence of signal (PROTO-12).
