---
id: glt.doc.security.supply-chain
owner: security
normativity: normative
status: accepted
depends_on:
  - glt.doc.security.sandbox
source_refs: []
---

# Supply chain

## Pinned artifacts

- Executor OCI image by digest
- Bootstrap verifier binary digest in manifest
- JSON Schema files by content hash

## SLSA-oriented targets (wave 4)

- Build provenance attestation for CP releases
- Signed SBOM for runner image
- Dependency lockfile in repo root

## DR gap (conditional pre-code)

Multi-region witness and audit replica — documented, not v1 blocker.
