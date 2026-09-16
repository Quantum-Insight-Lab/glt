---
id: glt.doc.security.sandbox
owner: security
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.runner
source_refs: []
---

# Runner sandbox

## Isolation checklist

- [ ] Disposable VM or rootless container per run
- [ ] Immutable git checkout at pinned commit
- [ ] Read-only source mount
- [ ] Writable scratch only (size cap)
- [ ] Empty/minimal environment
- [ ] No Docker socket, no host `/var/run`
- [ ] seccomp + cgroups limits
- [ ] Pinned signed executor image (digest in plan envelope)
- [ ] Network default OFF
- [ ] Egress allowlist via policy broker only
- [ ] Short-lived scoped credentials
- [ ] Output schema allowlist + redaction before persist

## Escape test scenarios (E06)

1. Mount host path attempt
2. Fork bomb / resource exhaustion
3. Egress to metadata service
4. Write outside scratch
5. Credential exfil in logs
6. Docker socket probe

All must **block** or **deny** with audit record.

## Admission (DEV-32)

`admitSandbox` is the single gate (S-4). Domain stays pure (S-1): the
profile and the envelope image arrive already parsed. The runner does
not spawn a host process and does not write the workspace.

Deny by default (INV-06):

- Network is `off` unless the policy broker supplied an egress grant digest.
- The branch under test is `untrusted` and the checkout is read-only.
- The executor image is the plan envelope digest (`isDigest`, PROTO-14).
  A floating tag is not a pin.
- Docker socket, host `/var/run`, and host credentials are absent.
- Writable paths stay under scratch. Timeout is P04 (`runner.default_timeout_seconds`).
- Persist goes through `scrubTelemetry`. Credentials and the DLP canary are denied.

`sandboxRun` admits the profile, then records `state: succeeded` for a
v1 read/build action. Host effects stay empty. `sandboxAuditRecord`
seals the report (`hashAuditRecord`, S-4). The event is
`glt.action.completed` (already in the registry). No `glt run` (S-10).
Receipts / PROTO-16 remain DEV-33.

## E06 mapping

| # | Attempt | Denial |
|---|---|---|
| 1 | Host path mount (`/etc`, `/home`, host drive) | `e06.host_mount` |
| 2 | Missing seccomp/cgroups, or timeout above P04 | `e06.resource_exhaustion` |
| 3 | Destination `169.254.169.254` / metadata service | `e06.metadata_egress` |
| 4 | Writable mount or write outside scratch | `e06.write_outside_scratch` |
| 5 | Credential key in env/persist, or DLP canary | `e06.credential_exfil` |
| 6 | Docker socket, `/var/run`, named pipe | `e06.docker_socket` |

Each attempt is denied. A report that claims a host effect cannot be sealed.

## Seeded failures S4–S6

| Seed | Injection | Expected |
|---|---|---|
| S4 | Backdate snapshot `as_of` | `snapshotIsStale` |
| S5 | Flip audit `prev_hash` | `verifyAuditChain` fails |
| S6 | Bind-mount `/etc` | `admitSandbox` deny |

## Safety-prep controls (T1–T10)

Documented here so the Safety gate can name the control. Verification
of the live environment stays on the isolation checklist above.

| Threat | Control in this step |
|---|---|
| T1 Forged snapshot evidence | Envelope snapshot digest; stale S4 |
| T2 Self-approval | `admitApprovedPlan` / INV-09 (DEV-30) |
| T3 Circular validation | Anti-cycle tests; not a sandbox hole |
| T4 Runner escape | E06.1–6 + no socket |
| T5 Stale witness | P06 / DEV-28; not bypassed here |
| T6 unknown_outcome retry | Deferred to DEV-33 (PROTO-16) |
| T7 PII in topology | `scrubTelemetry` on persist (E06.5) |
| T8 Tampered audit | S5 / `verifyAuditChain` |
| T9 LLM gate bypass | Catalog + PROTO-13; no new action id |
| T10 Bad executor image | Image = envelope digest (PROTO-14) |
