---
id: glt.doc.spec.policy
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.index
source_refs: []
---

# Policy Engine

## Principles

- Deny by default
- Allowlist actions and capabilities
- Risk from capability set, not label
- Freshness and conflict axes gate elevation

## Approval envelope digests

Must include:

- plan digest
- registry revision
- environment id
- topology snapshot digest
- ActionSpec digest(s)
- policy version digest
- executor image digest
- input digest
- credential scope digest

Any change → `approval invalidated`.

## Self-hosting

Plans affecting `glt.controlplane.*` release require **external** approver identity.

## LLM

Cannot approve. Cannot expand allowlist.

## Schema

Policy documents YAML in `trust/release-policy.yaml` (wave 4).
