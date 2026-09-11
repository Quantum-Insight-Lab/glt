---
id: glt.doc.spec.architecture
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.index
  - glt.doc.pda.blueprint
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "section:6"
    authority: engineering-contract
    role: informative
---

# Architecture

## Тезис

GLT — control plane **над** существующими SoT, не замена.

## Компоненты

| Component | Responsibility | SoT? |
|---|---|:---:|
| Registry Compiler | validate entries, resolve aliases | registry only |
| Snapshot Compiler | intended+build → snapshot | derived |
| Collectors | gather facts | per authority-map |
| State Evaluator | node axes | derived |
| Impact Engine | blast radius | derived |
| Action Planner | immutable DAG | derived |
| Policy Engine | allow/deny | policy spec |
| Runner | sandboxed execute | no |
| Audit Store | hash chain | audit |
| Dashboard/CLI | projection | no |

## Recommended stack (default)

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript strict | CLI + API |
| Schema | JSON Schema 2020-12 | source of wire types |
| CLI | node + commander | wave 1 |
| API | Fastify | wave 3 |
| Storage | PostgreSQL + JSONB | snapshots, audit |
| Cache | Redis | optional session |
| OTel | collector + prometheus | wave 3 |
| Sandbox | rootless container | wave 4 |
| Deploy | Docker Compose | v1 self-host |

## Module layout (implementation)

```
control-plane/
  packages/
    domain/          # pure: resolve, impact, policy
    registry/        # compiler
    snapshot/        # compiler + storage port
    collectors/      # git, ci, otel adapters
    impact/          # engine + CLI
    runner/          # planner + executor
    audit/           # chain store
    api/             # HTTP
    dashboard/       # React B1
  contracts/         # symlink or copy from specpack
```

## Boundaries

- `domain` — no I/O
- `collectors` — no policy decisions
- `runner` — no registry write
- `dashboard` — read-only except action requests through API
- `api` — Fastify composition root (DEV-21). GET returns the same artifacts
  as the CLI, validated by the same schemas. No workspace write. See
  [`api.md`](api.md).

## Build plane (DEV-18)

Intended and materialized are two lists. `comparePlanes` joins them by
SourceRef path (or by id when a path is absent). It does not merge them into
one node and it does not rewrite a plane assertion.

| Presence | `expected_from_step` | Class |
|---|---|---|
| both | — | `aligned` |
| intended only | present | `expected` — planned, not broken (PROTO-05) |
| intended only or materialized only | absent | `plane_drift` — a class, not a failure |

`plane_drift` is not `source_conflict`, not `unhealthy`, and not a schema
error. A planned DEV step without a package stays `expected` while it carries
`expected_from_step`.

A topology snapshot may **pin** both planes (DEV-20): intended nodes stay in
`nodes[]`; materialized facts are sealed as `collector_versions.git` and
`source_digests.git.*`. The two lists are not merged into one node. Golden
bootstrap (`glt.bootstrap-slice@1`) stays the four-node digest oracle.

## Diagram

См. [`../PDA/06-architectural-blueprint.md`](../PDA/06-architectural-blueprint.md).
