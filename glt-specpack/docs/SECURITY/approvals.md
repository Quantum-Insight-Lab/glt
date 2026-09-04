---
id: glt.doc.security.approvals
owner: policy-engine
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.policy
source_refs: []
---

# Approvals

## External approval required

- Any plan modifying CP release artifacts
- Executor image digest change
- Policy version change affecting write capabilities

## Envelope invalidation triggers

Any change to: plan, registry revision, environment, snapshot digest, ActionSpec, policy, executor image, input, credential scope.

## Identity separation

| Role | Identity |
|---|---|
| Runtime service | `glt-cp-runtime@internal` |
| Release builder | `glt-bootstrap-builder@external` |
| Approver | Human or SSO group outside runtime |

Self-approval attempts → deny + audit + alert (T2/T3).
