---
id: glt.doc.spec.api
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.architecture
  - glt.doc.spec.cli
  - glt.doc.spec.structural-invariants
  - glt.doc.spec.policy
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/policy.md
    authority: policy-approval
    role: derived-from
---

# HTTP API

The HTTP API is the wave 3 entry. The CLI stays the **reference client**:
a successful GET body is the same JSON document `glt <command> -o json`
prints, and it is checked with the same JSON Schema. A transport envelope
around that document is a contract failure, not a convenience.

Fastify is the only HTTP server (architecture.md). The package is a
composition root: it wires compilers and does not grow domain rules.

## Surface

| Method | Path | CLI artifact |
|---|---|---|
| `GET` | `/v1/registry` | `glt compile registry` |
| `GET` | `/v1/snapshot` | `glt compile snapshot` |
| `GET` | `/v1/impact` | `glt impact` |
| `GET` | `/v1/health` | `glt health` |
| `GET` | `/v1/resolve` | `glt resolve <ref>` |

`HEAD` is allowed on the same paths. `POST`, `PUT`, `PATCH` and `DELETE`
return 405. No route writes the workspace (S-5). The planner is
`buildPlan` (DEV-29). There is no `/v1/actions`: no `glt plan` command,
so there is no CLI artifact to return (S-10).

Query names match CLI flags: `registry`, `boundary`, `matrix`, `snapshot`,
`as-of`, `max-depth`. `resolve` takes `ref`.

No `glt` command is added. The process is started with `pnpm api`.

## Input versions

The body stays the artifact, so existing schemas keep `additionalProperties:
false`. Input identity travels in headers:

| Header | Meaning |
|---|---|
| `GLT-Snapshot-Id` | Snapshot id when a snapshot is produced or consumed |
| `GLT-Registry-Version` | Compiled registry SemVer |
| `GLT-Snapshot-Digest` | `sha256:<hex>` of the snapshot |
| `GLT-Registry-Digest` | `sha256:<hex>` of the compiled registry, via `digestOf` |
| `GLT-Exit-Code` | The CLI exit code for the same inputs |
| `GLT-Actor` | Presented identity (DEV-23) |
| `GLT-Role` | Role token from [policy.md](policy.md) |

A snapshot response always carries all four identity headers. Registry-only
and resolve responses carry registry identity; they do not invent a snapshot.

`GLT-Exit-Code` may be 5 on `GET /v1/health` while the body is still 200:
the artifact was produced, the graph said evidence is insufficient. That is
the same split as CLI stdout + exit 5.

## Access (DEV-23)

Deny by default. `authorize` in domain is the only decision. GET and HEAD
require `read`. A missing, empty, or unknown role is 403 (exit 4). The
artifact body is not wrapped. `request_action` and `approve` are not `read`.

The process defaults to `127.0.0.1`. Compose sets `HOST=0.0.0.0` inside the
container and publishes only `127.0.0.1:4174` on the host. No new dependency.
Approver binding is `approvePlan` (Ed25519). GET still uses headers.

## Errors

Failure bodies are the CLI stderr object: `code`, `message`, optional
`invariant`, optional `refs`. HTTP status follows the exit code:

| Exit | HTTP |
|---:|---:|
| 1 | 400 |
| 2 | 422 |
| 3 | 409 |
| 4 | 403 |
| 5 | 409 |
| 6 | 409 |
| 70 | 500 |

## Out of scope

- Persistence write routes (DEV-22 store is a library; GET still compiles)
- Event emit (names stay in the event registry; this step does not emit)
- New CLI verbs, workspace writes, action POST
- OIDC. Approver binding is the domain broker, not an HTTP plugin
