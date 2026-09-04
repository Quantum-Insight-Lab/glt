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
→ { "receipt_id": "wit-...", "signature": "..." }
```

## Staleness

If `now - last_receipt.timestamp > P06` → degrade to read-only runner.

## Seeded test (holdout #5)

Simulate witness outage → system enters read-only, alert fires, no silent continue.

## Self-report rule

CP-generated anchor **without** third-party signature does not satisfy witness requirement.
