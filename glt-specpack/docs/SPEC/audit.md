---
id: glt.doc.spec.audit
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.policy
source_refs: []
---

# Audit store

## Record shape

```yaml
record_id: aud-001
prev_hash: sha256:...
record_hash: sha256:...
timestamp: 2026-08-14T10:00:00Z
event_type: glt.action.completed
payload_digest: sha256:...
signature: ...
```

## Requirements

- Write-ahead attempt before side effect
- Hash-chained records
- WORM or verify-on-read store
- Target-side idempotency token when supported
- External receipts for cross-system effects

## Verification

Daily job: full chain verify. Failure → runner stop (degradation).

## Witness anchor

External witness signs `head_hash` periodically. See SECURITY docs.

## Schema

[`../../contracts/schemas/audit-record.schema.json`](../../contracts/schemas/audit-record.schema.json)

## Retention

Parameter P05 (default 365 days).
