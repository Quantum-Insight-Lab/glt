---
id: glt.doc.security.external-witness
owner: security
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.audit
source_refs: []
---

# External witness

Independent trust domain anchoring audit chain head.

## Protocol

```
POST /v1/anchor
{ "head_hash": "sha256:...", "chain_id": "glt-audit-main", "timestamp": "..." }
→ { "receipt_id": "wit-...", "signature": "...", "witness_id": "..." }
```

`head_hash` is the audit chain head. The receipt is saved by the client.
The event is `glt.witness.anchored` (already in the registry). No new
`glt` command (S-10).

## Endpoint (DEV-28)

The runtime URL is `WITNESS_ENDPOINT` on the machine (same secret path
as `deploy/.env`). It is not a Compose service: a witness inside the
control-plane stack would be a second trust domain that is not
independent.

`https://witness.example.invalid/v1/anchor` is a placeholder. The client
rejects `example.invalid`. The signed bootstrap manifest stays architect
territory; this step does not rewrite it.

## Staleness

Age and P06 (`glt.param.witness.max_staleness_seconds`) arrive already
in seconds. Stale vs current is `snapshotIsStale` (S-4) — one clock, not
a second witness timer. If there is no external receipt, or the age is
past P06 → read-only: `write_blocked` (see [`../SPEC/degradation.md`](../SPEC/degradation.md)).
Absence of a receipt is not a fresh anchor (PROTO-12).

## Seeded test (holdout #5)

Simulate witness outage → system enters read-only, alert fires, no silent continue.

## Anti-cycle (INV-09)

A CP-generated anchor **without** a third-party signature does not
satisfy the witness requirement. `glt-cp-runtime@internal` is not a
witness. `verifyAuditChain` names local consistency (INV-07). It is not
an external receipt. Treating a green local verify as an anchor is the
cycle this gate forbids.

`assessWitnessFreshness` and `acceptWitnessReceipt` live in
`packages/domain`. The HTTP client and the saved receipt live in
`packages/audit`.
