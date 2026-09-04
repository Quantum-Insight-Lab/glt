---
id: glt.doc.observability.runbooks-index
owner: reliability
normativity: normative
status: accepted
depends_on:
  - glt.doc.observability.metrics
source_refs: []
---

# Runbooks index

| Runbook | Trigger |
|---|---|
| [authority-conflict.md](runbooks/authority-conflict.md) | authority_violations |
| [snapshot-digest-mismatch.md](runbooks/snapshot-digest-mismatch.md) | compile hash drift |
| [audit-chain-break.md](runbooks/audit-chain-break.md) | verify fail |
| [runner-unknown-outcome.md](runbooks/runner-unknown-outcome.md) | unknown_outcome |
| [witness-stale.md](runbooks/witness-stale.md) | staleness > P06 |
| [bootstrap-trust-fail.md](runbooks/bootstrap-trust-fail.md) | verifier fail at start |

Each runbook: detect → mitigate → escalate → postmortem template.
