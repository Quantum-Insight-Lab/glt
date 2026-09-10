---
id: glt.doc.spec.collectors
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.snapshots
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/parameters/collector-git-freshness.yaml
    authority: parameter-values
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/snapshots.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/parameters/collector-ci-freshness.yaml
    authority: parameter-values
    role: derived-from
---

# Collectors

## Classes

| Collector | Plane | Authority |
|---|---|---|
| Intent | intended | docs/SPEC, DEV, registry |
| Git | materialized | git tree |
| CI | materialized | attestations, test reports |
| Schema | materialized | JSON Schema validation |
| OTel | observed | metrics/traces (aggregates) |
| Health | observed | HTTP health endpoints |
| Deploy | observed | deployment metadata |

## Collector contract

```yaml
id: glt.collector.git@1
inputs:
  repository_url: required
  commit: required
outputs:
  - module_graph
  - file_ownership_hints
  - source_digests
freshness_ttl_seconds: 3600
privacy: no_content_payloads
```

TTL is the parameter card `glt.param.collector.git.freshness_ttl_seconds`, not a literal in `packages/domain`.

```yaml
id: glt.collector.ci@1
inputs:
  commit: required
  report: required
outputs:
  - checks
  - attestations
  - freshness
freshness_ttl_seconds: 3600
privacy: no_content_payloads
```

TTL is the parameter card `glt.param.collector.ci.freshness_ttl_seconds`. Age vs TTL uses `snapshotIsStale` (S-4): one stale predicate, not a second clock.

## v1 scope

- **Wave 1:** Intent (DEV frontmatter, registry)
- **Wave 2:** Git + CI + schema validators
- **Wave 3:** OTel aggregates + health

## Git collector v1 (DEV-13)

Facts from a **pinned commit**, not from the working tree. The collector records what the tree contains. It does not decide release, required checks, health or gates.

Required inputs: `commit` and `repository_url`. Either missing or unresolvable → `coverage: unknown` and a `known_unknowns` entry. That is not a green empty graph (PROTO-12).

Outputs at this step:

| Output | Source at the commit | Missing evidence |
|---|---|---|
| `module_graph` | `pnpm-workspace.yaml` + each workspace `package.json`; edges are `workspace:` dependencies | no workspace file → `unknown`, not `nodes: []` as “no modules” |
| `file_ownership_hints` | `CODEOWNERS` / `.github/CODEOWNERS` / `docs/CODEOWNERS` | file absent → `null` plus `missing_ownership`, not `[]` as “unowned” |
| `source_digests` | `digestOfUtf8` of those manifests and the ownership file, after newline normalization | only hashed files; not the whole tree |

v1 hashes **workspace manifests and ownership files**, not every blob. Full-tree identity stays a later expansion. Snapshot `collector_versions` and golden digests are not rewritten here; merging materialized facts into a topology snapshot is DEV-18.

Every assertion carries `plane: materialized`. An `intended` plane is rejected, not stored.

Privacy: paths and digests only. File bodies are not in the report.

The collector is not a `glt` command (S-10). It does not write the workspace.

## CI attestations collector v1 (DEV-14)

Facts from a **pinned commit** plus a CI report document (test conclusions, attestation digests). The collector records what the report contains. It does not decide release, required checks, health or gates.

A report **without `commit` is not accepted** (PROTO-12): `coverage: unknown`, checks empty, exit 5. That is not a green empty check list.

`produced_at` older than the TTL → `freshness: stale`. Historical `checks` stay; `current_checks` is empty so a stale signal cannot enter a current health calculation (PROTO-11). Age vs TTL is `snapshotIsStale`.

Collection failure (missing file, unreadable document) with a commit pin → `coverage: partial` and `known_unknowns`, not `established`. Empty `checks` is not “all tests passed”.

Privacy: names, conclusions and digests only. Log bodies are not in the report.

The collector is not a `glt` command (S-10). It does not write the workspace. Merging into a topology snapshot is DEV-18.

## DLP

Scrub before export. Allowlist schema only. Canary tests mandatory (INV-11).

## Registry entries

Collector nodes registered in meta-registry with `kind: collector`.
