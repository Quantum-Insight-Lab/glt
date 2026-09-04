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

## Schemas

- [`../../contracts/schemas/action-spec.schema.json`](../../contracts/schemas/action-spec.schema.json)
- [`../../contracts/schemas/action-plan.schema.json`](../../contracts/schemas/action-plan.schema.json)
