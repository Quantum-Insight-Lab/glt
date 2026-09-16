---
id: glt.doc.spec.runner
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.policy
  - glt.doc.spec.audit
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "section:9"
    authority: engineering-contract
    role: informative
---

# Runner v1

## Allowed actions (read/build)

| Action | Risk | Sandbox |
|---|---|---|
| inventory | read | no |
| validate | read | container optional |
| compile | read | container |
| typecheck | read | container |
| test | read | container |
| health | read | network policy |

## Forbidden v1

`commit`, `push`, `deploy`, `self_upgrade`, `self_write`, arbitrary shell.

## Plan lifecycle

```
draft → dry_run → awaiting_approval → approved → queued → running
  → succeeded | failed | canceled | expired | unknown_outcome → reconciling
```

## Sandbox requirements

- Disposable VM or rootless container
- Immutable checkout, read-only source
- Empty HOME, minimal env
- No docker socket, no host credentials
- seccomp/cgroups, pinned signed executor image
- Network off by default; egress via policy broker
- Resource/time limits (see `runner.default_timeout_seconds`)

## unknown_outcome

If connection lost after external effect without receipt → `unknown_outcome`, reconcile, **no blind retry**.

## Risk calculation

Based on **capabilities**, not action display name.

## Planner (DEV-29)

`buildPlan` assembles an immutable draft from a **catalog** of ActionSpecs.
The catalog arrives already parsed (registry `kind: action` entries, or a
fixture). The planner does not invent an ActionSpec and does not write the
registry (S-5).

An action id that is not in the catalog is denied (PROTO-13, INV-06).
`commit`, `push`, `deploy`, `migration`, `self_upgrade`, `self_write` and
`shell` are denied even if someone puts them in the catalog (PROTO-17).
A capability outside the v1 allowlist above is an unknown capability
(PROTO-13). v1 plans accept only `risk_class` `read` or `read_build`.

`depends_on` is an execution DAG. Cycles are PROTO-07. `findCycles` is
the one cycle detector (S-4).

The envelope is sealed by `digestOf` (S-4, PROTO-14). It always carries
four digests: **plan**, **policy**, **executor image**, **snapshot**.
Missing or non-digest values are not a seal. `envelope_digest` is the
digest of that four-field object.

The created plan is `state: draft`. The event is `glt.plan.created`
(already in the registry). No `glt plan` command (S-10). `glt typecheck`
and `glt test` stay declared; real execution is DEV-32.

`buildPlan` lives in `packages/domain`. The event wrapper lives in
`packages/runner`.

## Approval broker (DEV-30)

`approvePlan` binds an external approver to the **approval** envelope
(the nine fields in [policy.md](policy.md)) with Ed25519. Risk is
`riskFromCapabilities`, not the action display name. `admitApprovedPlan`
re-seals the current inputs, verifies the signature, and calls
`authorize` again (PROTO-15, INV-08, INV-09). The runner identity
cannot approve.

The event is `glt.plan.approved` (already in the registry). No
`glt approve` command (S-10). Shadow is DEV-31. Sandboxed execution is DEV-32.

## Shadow runner (DEV-31)

`shadowRun` is a dry-run. It does not perform an external effect:
the report `effects` list is empty, or the run is denied (INV-06).
Domain stays pure (S-1). There is no filesystem, network, or subprocess.

`requireDryRunBeforeWrite` is the write gate. A `write` or `external`
risk without a `state: dry_run` report for the **same** envelope is
denied. A label cannot skip the gate: risk is `riskFromCapabilities`.

`shadowAuditRecord` seals the report as an AuditRecord (`hashAuditRecord`,
S-4). `packages/runner` emits `glt.action.started` (already in the
registry). No `glt shadow` or `glt run` command (S-10). Side-effecting
execution is DEV-32. Receipts are DEV-33.

## Sandboxed runner (DEV-32)

`admitSandbox` is deny-by-default isolation. Domain stays pure (S-1):
no filesystem, network, or subprocess. The profile is admitted or the
run is denied (INV-06). Network is off unless the policy broker
granted egress. The branch under test is untrusted. There is no Docker
socket and no host credential. The executor image is the envelope
digest (PROTO-14).

`sandboxRun` records a completed read/build attempt only after
admission. Host effects stay empty. Timeout is P04. `sandboxAuditRecord`
seals the report (`hashAuditRecord`, S-4). `packages/runner` emits
`glt.action.completed` (already in the registry). No `glt run` (S-10).
Escape scenarios E06.1–6 are denied. Seeded failures S4–S6 are
automated. Receipts are DEV-33.

## Receipts (DEV-33)

`recordAttempt` seals the attempt before any external effect (PROTO-16).
Lost contact after the effect without a receipt is `unknown_outcome`.
There is no blind retry. `reconcileOutcome` sets succeeded or failed
only from a target observation of the same attempt key; otherwise the
state stays `unknown_outcome` and is not success. `packages/runner`
emits `glt.action.completed` through `actionCompletedEvent` (S-4).
No `glt reconcile` (S-10).

## Supply chain (DEV-34)

The executor image in the envelope is still a digest (PROTO-14).
Signing that pin and admitting a control-plane release is
`admitRelease`, not a runner verb. See
[`../SECURITY/supply-chain.md`](../SECURITY/supply-chain.md).

## Schemas

- [`../../contracts/schemas/action-spec.schema.json`](../../contracts/schemas/action-spec.schema.json)
- [`../../contracts/schemas/action-plan.schema.json`](../../contracts/schemas/action-plan.schema.json)
