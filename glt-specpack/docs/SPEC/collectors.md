---
id: glt.doc.spec.collectors
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.snapshots
source_refs: []
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

## v1 scope

- **Wave 1:** Intent (DEV frontmatter, registry)
- **Wave 2:** Git + CI + schema validators
- **Wave 3:** OTel aggregates + health

## DLP

Scrub before export. Allowlist schema only. Canary tests mandatory (INV-11).

## Registry entries

Collector nodes registered in meta-registry with `kind: collector`.
