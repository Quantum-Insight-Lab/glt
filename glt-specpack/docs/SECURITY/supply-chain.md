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

`release_trust_roots.allowed` stays empty until DEV-35. An empty
allow-list does not admit a sealed release; this step does not fill it
and does not accept the published dev-only key as a T0 root.

No Cosign, no SLSA encoder, no new event, no `glt release` (S-10).
SBOM and provenance remain wave-4 targets, not a second pin mechanism.

## SLSA-oriented targets (wave 4)

- Build provenance attestation for CP releases
- Signed SBOM for runner image
- Dependency lockfile in repo root

## DR gap (conditional pre-code)

Multi-region witness and audit replica — documented, not v1 blocker.
Sealed release and the non-empty trust-root allow-list are DEV-35.
