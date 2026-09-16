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
DEV-23 `authorize` denies the author of a plan and `glt-cp-runtime@internal`
(INV-09). DEV-27 self-observation does not grant `approve`. DEV-30
`admitApprovedPlan` rebuilds the envelope and calls `authorize` again
immediately before run. A field change invalidates the approval
(PROTO-15, INV-08). DEV-34 `admitRelease` calls `authorize` for a
control-plane release; the runtime identity remains forbidden.
