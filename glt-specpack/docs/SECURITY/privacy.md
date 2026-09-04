---
id: glt.doc.security.privacy
owner: security
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.provenance
source_refs: []
---

# Privacy

## Forbidden in topology and CP audit

- Raw user content
- Platform user IDs (plain or hashed)
- Prompt bodies
- Secrets and API keys
- Signed personal links

## Allowed aggregates

- Event type counts
- Latency histograms
- Error rates by node
- Model/prompt **version** ids (not content)
- Opaque CP trace ID (not derived from user data)

## DLP

- Allowlist telemetry schema before export
- Scrub/drop at collector boundary
- Canary secret injection tests in CI

## Correlation

Purpose-scoped HMAC keys; no cross-purpose reuse.
