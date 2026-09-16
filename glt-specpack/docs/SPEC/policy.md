---
id: glt.doc.spec.policy
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.index
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/approvals.md
    authority: policy-approval
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/self-hosting.md
    authority: engineering-contract
    role: derived-from
---

# Policy Engine

## Principles

- Deny by default
- Allowlist actions and capabilities
- Risk from capability set, not label
- Freshness and conflict axes gate elevation

## RBAC (DEV-23)

Access is decided by `authorize` in `packages/domain`. There is no second
table and no Fastify ACL plugin (S-4). Collectors do not decide policy.

A missing principal, an empty actor, or a role that is not in the allowlist
receives **no** capability. That is the default, not a fallback to `read`.

Capabilities are distinct tokens. Holding one does not imply another:

| Capability | Meaning |
|---|---|
| `read` | Observe compiled artifacts (HTTP GET/HEAD) |
| `request_action` | Ask for an action. Not `read`. Not `approve`. |
| `approve` | Approve a plan the actor did not author |

Roles and the capabilities they hold:

| Role | Capabilities |
|---|---|
| `reader` | `read` |
| `requester` | `request_action` |
| `approver` | `approve` |
| `llm` | none |

`llm` cannot approve and cannot expand the allowlist. The allowlist is this
table. A caller cannot pass extra capabilities into `authorize`.

The HTTP API presents the principal in headers (`GLT-Actor`, `GLT-Role`).
The body stays the CLI artifact. Cryptographic binding of the actor is
DEV-30. Bind remains `127.0.0.1`. No `glt` command is added.

GET/HEAD require `read`. `request_action` exists so it cannot be smuggled
in as read. Plan assembly is `buildPlan` (DEV-29). Action POST waits for
a CLI artifact; there is no `glt plan` verb (S-10). Approval is DEV-30.

## Self-approval (INV-09)

A principal cannot approve a plan they authored. `glt-cp-runtime@internal`
cannot approve. A plan that affects a `glt.controlplane.*` release requires
an identity outside the runtime. Self-observation (DEV-27) does not
grant `approve`: compiling or watching own topology is not a release
approval. See [approvals.md](../SECURITY/approvals.md)
and [self-hosting.md](self-hosting.md).

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

Any change → `approval invalidated`. Envelope re-check at run is DEV-30.

## Self-hosting

Plans affecting `glt.controlplane.*` release require **external** approver identity.

## LLM

Cannot approve. Cannot expand allowlist.

## Schema

Policy documents YAML in `trust/release-policy.yaml` (wave 4).
