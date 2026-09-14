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

## PostgreSQL (DEV-22)

Records live in one append-only JSONB table. `INSERT` is the only write.
`UPDATE` and `DELETE` fail in SQL (trigger), including a retention sweep:
P05 names how long to keep the chain visible, not a licence to erase it.
A missing day is a new record or a known unknown, not a hole punched in
the table (INV-07).

`record_hash` is `hashAuditRecord` from `packages/domain` — the same digest
as every other hash (S-4). The first `prev_hash` is the genesis digest
`hashAuditRecord({ record_id: "genesis", prev_hash: "" })`. Verify-on-read
uses `verifyAuditChain`.

`event_type` is a generated constant from the event registry. This step
does not emit `glt.audit.appended` (DEV-24).

The store is `packages/audit`. No `glt` command. No workspace write.

## Verification

Daily job: full chain verify. Failure → runner stop (degradation).

## Witness anchor

External witness signs `head_hash` periodically. See SECURITY docs.

## Schema

[`../../contracts/schemas/audit-record.schema.json`](../../contracts/schemas/audit-record.schema.json)

## Retention

Parameter P05 (default 365 days).
