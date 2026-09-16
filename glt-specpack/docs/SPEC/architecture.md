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

- `domain` — no I/O. `authorize` (DEV-23) lives here: deny by default.
- `collectors` — no policy decisions. `exportOtel` (DEV-24) publishes Build
  metrics after scrub. See [`collectors.md`](collectors.md).
- `runner` — no registry write
- `dashboard` — read-only except action requests through API
- `api` — Fastify composition root (DEV-21). GET returns the same artifacts
  as the CLI, validated by the same schemas. GET/HEAD require `read`
  (DEV-23). No workspace write. See [`api.md`](api.md).
- `snapshot` / `audit` — PostgreSQL JSONB store (DEV-22). Snapshots are
  immutable after put. Audit is insert-only. Digest after read is
  `digestOf` (PROTO-03). `exportAuditChain` emits `glt.audit.appended` (DEV-24).

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

## Drift (DEV-26)

Incident traversal uses the incident matrix rows, not change rows.
Materialized spread is a candidate; observed trace-parentage confirms it.
A deployment hash that is missing or differs from the build hash is `drift`,
not silence. See [`degradation.md`](degradation.md) and [`impact.md`](impact.md).

## Deploy (DEV-25)

Wave 3 self-host is Docker Compose: api + postgres + redis + otel-collector.
The file is `deploy/compose.yaml`. Pulled images are pinned by digest, not by
tag. Secrets come from `deploy/.env` on the machine; they are not in the
repository. The host publishes the API on `127.0.0.1` only. The CLI has no deploy verb.
See [`self-hosting.md`](self-hosting.md).

## Dogfood (DEV-27)

The live subject is this repository, described by
`registry/glt-controlplane.yaml`. Observation compiles that bundle,
collects git facts from the same repo, and classifies a seeded
deploy/build pin. Intended and materialized stay two lists
(`comparePlanes`). The observation does not approve a control-plane
release (INV-09). See [`self-hosting.md`](self-hosting.md).

## Diagram

См. [`../PDA/06-architectural-blueprint.md`](../PDA/06-architectural-blueprint.md).
