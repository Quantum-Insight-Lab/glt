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

## Graceful UI

Always show: snapshot age, boundary id, classifier version, known_unknowns count.

Never imply health from absence of signal (PROTO-12).
