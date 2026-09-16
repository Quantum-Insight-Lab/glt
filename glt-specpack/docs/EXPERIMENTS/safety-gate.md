---
id: glt.doc.experiments.safety-gate
owner: security
normativity: normative
status: accepted
depends_on:
  - glt.doc.security.threat-model
  - glt.doc.experiments.rubric
source_refs: []
---

# Safety gate (after DEV-32)

## Criteria

| Criterion | Requirement |
|---|---|
| T1-T10 scenarios | Documented control verified |
| E06 escape tests | 100% blocked |
| INV-07 to INV-10 | Staging suite green |
| H05 holdout | Chain verify fails as expected |
| Witness stale (H05 ext) | Read-only mode engaged |

## Fail actions

- No production runner
- No self-hosted release without external approval

## Pass actions

- DEV-33+ shadow runner
- Sealed release track (DEV-35)

## Sealed admission (DEV-35)

`admitSealedRelease` is the single seal gate (S-4). It calls
`admitRelease` first, then fails closed on trust roots and
placeholders. Domain stays pure (S-1): policy, artifacts and the
release input arrive already parsed. `trust/` is not rewritten here.

A seal requires:

1. **Safety evidence already in the repo.** T1–T10 named in
   `docs/SECURITY/threat-model.md`. E06.1–6 denied by `admitSandbox`
   (INV-06). INV-07…10 have named tests. Holdout H01–H05 stays the
   E03 set and is not used to tune parameters.
2. **No placeholder (PROTO-10).** Verifier binary digest is
   `isDigest` and not the all-zero freeze token. Golden fixture
   digests are frozen (INV-03). Witness endpoint is not
   `example.invalid` (`requireWitnessEndpoint`).
3. **Trust root (INV-10).** `release_trust_roots.allowed` is
   non-empty. The terminating key is in `allowed` and not in
   `forbidden`. `glt-dev-only-2026` is never a release root.
   Filling `allowed` in `trust/release-policy.yaml` is an operator
   action, not this gate inventing a T0 key.

Fail actions stay in force: no production runner and no self-hosted
release without external approval. No `glt seal` (S-10). No new event.

DR for a non-author is
[`../OBSERVABILITY/runbooks/disaster-recovery.md`](../OBSERVABILITY/runbooks/disaster-recovery.md).
