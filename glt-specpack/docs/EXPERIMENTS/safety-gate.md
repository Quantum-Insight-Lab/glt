---
id: glt.doc.experiments.safety-gate
owner: security
normativity: normative
status: accepted
depends_on:
  - glt.doc.security.threat-model
  - glt.doc.experiments.rubric
source_refs: []
---

# Safety gate (after DEV-32)

## Criteria

| Criterion | Requirement |
|---|---|
| T1-T10 scenarios | Documented control verified |
| E06 escape tests | 100% blocked |
| INV-07 to INV-10 | Staging suite green |
| H05 holdout | Chain verify fails as expected |
| Witness stale (H05 ext) | Read-only mode engaged |

## Fail actions

- No production runner
- No self-hosted release without external approval

## Pass actions

- DEV-33+ shadow runner
- Sealed release track (DEV-35)
