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

`event_type` is a generated constant from the event registry.

## Export (DEV-24)

`exportAuditChain` projects the stored records. Each record yields one
`glt.audit.appended` via `EventType.AuditAppended` (not a string literal).
Payload is `record_id` and `prev_hash` only. The projection is scrubbed
before return (INV-11). No `glt` command. No workspace write.

The store is `packages/audit`.

## Verification

Daily job: full chain verify. Failure → runner stop (degradation).

## Witness anchor (DEV-28)

External witness signs `head_hash`. The client posts to
`WITNESS_ENDPOINT`, rejects `example.invalid`, and saves the receipt.
A receipt without a third-party signature is not an anchor. The
projection emits `glt.witness.anchored` (`EventType.WitnessAnchored`).
See [external-witness.md](../SECURITY/external-witness.md).

## Receipts (DEV-33)

`recordAttempt` is the write-ahead mark (PROTO-16). Domain stays pure
(S-1). An external effect without that mark is denied. Lost contact
after the effect, with no target receipt, is `unknown_outcome`.
`denyBlindRetry` forbids an automatic second effect on the same
attempt. `reconcileOutcome` asks the target by the attempt idempotency
key and writes a **new** AuditRecord (`hashAuditRecord`, S-4). The
previous record is not rewritten (INV-07).

`unknown_outcome` is a legal terminal state. It is not success. The
events are `glt.action.started` (attempt) and `glt.action.completed`
(reconcile) — already in the registry. No `glt reconcile` (S-10).

## Schema

[`../../contracts/schemas/audit-record.schema.json`](../../contracts/schemas/audit-record.schema.json)

## Retention

Parameter P05 (default 365 days).
