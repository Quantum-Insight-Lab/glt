---
id: glt.doc.security.supply-chain
owner: security
normativity: normative
status: accepted
depends_on:
  - glt.doc.security.sandbox
  - glt.doc.spec.self-hosting
  - glt.doc.spec.policy
  - glt.doc.spec.snapshots
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/sandbox.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/self-hosting.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/policy.md
    authority: policy-approval
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/snapshots.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/approvals.md
    authority: policy-approval
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/threat-model.md
    authority: engineering-contract
    role: derived-from
---

# Supply chain

## Pinned artifacts

- Executor OCI image by digest
- Bootstrap verifier binary digest in manifest
- JSON Schema files by content hash

A tag without `@sha256:` plus 64 hex digits is not a pin (PROTO-10).
`isPinnedImageRef` is the single pin check (S-4). Compose pulled images
and Dockerfile `FROM` use it; a second regex is a second mechanism.

## Admission (DEV-34)

`admitRelease` is the single release gate (S-4). Domain stays pure
(S-1): image refs, signatures, input digests and the release policy
arrive already parsed. The gate does not pull, build, or push an image
and does not write the workspace.

Three checks, all required:

1. **Pin and sign (T10).** Every release image is `name[:tag]@sha256:`
   plus 64 hex digits. The digest is `isDigest` and is not the all-zero
   placeholder. The image is signed: `verifyBytes` over
   `digestOf({ ref, digest })` (S-4, PROTO-14). A floating tag is not a
   pin (PROTO-10).
2. **Reproducible inputs (PROTO-03, PROTO-10).** Lockfile, `FROM`
   image, schema set and source are content digests. The input digest
   is `digestOf` of that object. A second computation must match.
   Unsigned or unpinned inputs are not a release.
3. **External approval (INV-09).** The parsed
   `trust/release-policy.yaml` requires external approval.
   `glt-cp-runtime@internal` is forbidden. `admitRelease` calls
   `authorize` with `approve` and
   `affects_control_plane_release: true`. Self-observation is not an
   approval. There is no second ACL.

`admitSealedRelease` (DEV-35) wraps this gate. An empty
`release_trust_roots.allowed` is not a seal (INV-10). The published
dev-only key is never a T0 root. Placeholders are not a seal
(PROTO-10). The gate does not write `trust/`.

No Cosign, no SLSA encoder, no new event, no `glt release` (S-10).
SBOM and provenance remain wave-4 targets, not a second pin mechanism.

## SLSA-oriented targets (wave 4)

- Build provenance attestation for CP releases
- Signed SBOM for runner image
- Dependency lockfile in repo root

## Disaster recovery (DEV-35)

v1 restore is a single-region Compose stack plus the audit hash
chain and an external witness receipt. Multi-region replica remains
a documented gap, not a second store. The procedure is
[`../OBSERVABILITY/runbooks/disaster-recovery.md`](../OBSERVABILITY/runbooks/disaster-recovery.md).
