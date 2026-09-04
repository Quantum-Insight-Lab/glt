---
id: glt.doc.pda.control-surfaces
owner: product-architecture
normativity: normative
status: accepted
depends_on:
  - glt.doc.pda.invariants
source_refs: []
---

# PDA Step 5 — Control surfaces (Parameter Cards)

7 начальных cards. Полные YAML: [`../../parameters/`](../../parameters/).

---

## Summary

| ID | Parameter | Default | Range | Risk if too low | Risk if too high | Calibration |
|---|---|---:|---|---|---|---|
| P01 | `snapshot.stale_after_seconds` | 3600 | 300–86400 | Stale data acted on | Freshness noise | Incident postmortems |
| P02 | `impact.max_traversal_depth` | 8 | 3–20 | Missed dependents | Noise blast radius | Golden cases |
| P03 | `dashboard.max_top_level_nodes` | 16 | 8–24 | Clutter | Lost context | UX task tests |
| P04 | `runner.default_timeout_seconds` | 600 | 60–3600 | Hung jobs | False timeouts | p95 action duration |
| P05 | `audit.retention_days` | 365 | 90–2555 | Lost forensics | Storage cost | Compliance req |
| P06 | `witness.max_staleness_seconds` | 7200 | 600–86400 | Stale anchor trusted | False stale alerts | Witness heartbeat |
| P07 | `classifier.confidence_threshold` | 0.85 | 0.5–1.0 | Wrong gate | Over-blocking | Labeled change set |

---

## Правила параметров

1. **Product** (P03) vs **Reliability** (P01, P04, P05, P06) — разные owners review.
2. Изменение parameter → revision bump in parameters index, not silent.
3. Experiments may fork parameters in sandbox only until promoted.

---

## Non-random defaults rationale

- **P01 3600:** hourly CI cadence typical for small teams
- **P02 depth 8:** covers 4-node slice × 2 hops with margin
- **P03 16:** GLT 2.0 readability rule 12–20, lower bound for MVP
- **P04 600:** typecheck+test budget for bootstrap slice
- **P05 365:** common SOC2 minimum
- **P06 7200:** 2× expected witness interval
- **P07 0.85:** conservative gate until labeled set >100

---

## Files

- [`../../parameters/snapshot-stale-after.yaml`](../../parameters/snapshot-stale-after.yaml)
- [`../../parameters/impact-traversal-depth.yaml`](../../parameters/impact-traversal-depth.yaml)
- [`../../parameters/dashboard-max-nodes.yaml`](../../parameters/dashboard-max-nodes.yaml)
- [`../../parameters/runner-timeout.yaml`](../../parameters/runner-timeout.yaml)
- [`../../parameters/audit-retention.yaml`](../../parameters/audit-retention.yaml)
- [`../../parameters/witness-staleness.yaml`](../../parameters/witness-staleness.yaml)
- [`../../parameters/classifier-threshold.yaml`](../../parameters/classifier-threshold.yaml)
