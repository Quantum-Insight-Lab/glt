---
id: glt.doc.security.bootstrap-trust
owner: security
normativity: normative
status: accepted
depends_on:
  - glt.doc.security.threat-model
source_refs: []
---

# Bootstrap trust

## T0 requirements

1. Root public key outside manifest under test (`trust/seed-public-keys/`)
2. Minimal verifier binary/schema pinned in signed manifest
3. Trusted builder identity separate from runtime service account
4. Release policy YAML for CP artifacts

## Verification flow

```
Load T0 keys → Verify manifest signature → Validate schemas
→ Hash registry bundle → Compile golden snapshot → Compare digest
```

## Failure modes

| Failure | Action |
|---|---|
| Bad manifest sig | Refuse start |
| Golden digest mismatch | Refuse start |
| Missing seed key | Refuse start |

## Files

- [`../../trust/bootstrap-manifest.yaml`](../../trust/bootstrap-manifest.yaml)
- [`../../trust/seed-public-keys/README.md`](../../trust/seed-public-keys/README.md)
