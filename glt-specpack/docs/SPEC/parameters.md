---
id: glt.doc.spec.parameters
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.pda.control-surfaces
source_refs: []
---

# Parameters index

Canonical YAML in [`../../parameters/`](../../parameters/).

| ID | File | Default |
|---|---|---|
| P01 | snapshot-stale-after.yaml | 3600 |
| P02 | impact-traversal-depth.yaml | 8 |
| P03 | dashboard-max-nodes.yaml | 16 |
| P04 | runner-timeout.yaml | 600 |
| P05 | audit-retention.yaml | 365 |
| P06 | witness-staleness.yaml | 7200 |
| P07 | classifier-threshold.yaml | 0.85 |

## Change process

1. Edit parameter card YAML
2. Bump `revision` in card
3. Document rationale in CHANGELOG
4. Re-run affected golden tests

## Product vs reliability

P03 → product review. P01,P04,P05,P06 → SRE/reliability review.
