---
id: glt.doc.pda.invariants
owner: product-architecture
normativity: normative
status: accepted
depends_on:
  - glt.doc.pda.domain-graph
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "section:5"
    authority: engineering-contract
    role: informative
---

# PDA Step 4 — Инварианты

12 invariant sheets. Каждый: mechanism, test, metric, runbook.

---

## INV-01 Single authority per fact class

**Statement:** Каждый класс фактов имеет ровно одного owner из authority-map.

**Mechanism:** Bootstrap verifier + CI check on authority-map.yaml.

**Test:** Inject duplicate owner → verifier FAIL.

**Metric:** `authority_violations_total` = 0.

**Runbook:** [`../OBSERVABILITY/runbooks/authority-conflict.md`](../OBSERVABILITY/runbooks/authority-conflict.md)

---

## INV-02 Resolve or error

**Statement:** `resolve(alias)` → `{id, revision}` | error. No guess.

**Mechanism:** Registry compiler strict lookup.

**Test:** Unknown alias → structured error, no fallback id.

**Metric:** `resolve_ambiguous_total` = 0 in production.

**Runbook:** registry-alias-collision.md

---

## INV-03 Snapshot determinism

**Statement:** Same pinned inputs → same snapshot digest.

**Mechanism:** Canonical JSON serialization; pinned collector versions.

**Test:** Golden snapshot hash match.

**Metric:** `snapshot_hash_drift` = 0 for pinned CI job.

**Runbook:** snapshot-digest-mismatch.md

---

## INV-04 Inference ≠ observation

**Statement:** Inferred facts never displayed as direct observations.

**Mechanism:** State evaluator provenance class filter in UI/API.

**Test:** UI test: inference badge mandatory.

**Metric:** `inference_mislabeled_total` = 0.

**Runbook:** provenance-mislabel.md

---

## INV-05 Impact honesty

**Statement:** Impact report lists `known_unknowns`; no false completeness.

**Mechanism:** Boundary manifest required; empty unknown only inside boundary.

**Test:** Golden case outside boundary → listed in known_unknowns.

**Metric:** `false_complete_reports` = 0.

**Runbook:** impact-boundary.md

---

## INV-06 Deny by default runner

**Statement:** Unlisted action/capability → deny.

**Mechanism:** Policy engine allowlist; risk from capabilities not names.

**Test:** Arbitrary shell → blocked.

**Metric:** `runner_deny_default_hits` (expected on fuzz).

**Runbook:** runner-policy-deny.md

---

## INV-07 Tamper-evident audit

**Statement:** Audit chain hash-linked; modification detectable.

**Mechanism:** WORM store; each record includes prev_hash.

**Test:** Tamper single record → verification FAIL.

**Metric:** `audit_chain_verify_success` = 1.0.

**Runbook:** audit-chain-break.md

---

## INV-08 Plan immutability after approval

**Statement:** Any digest change in plan envelope → approval invalidated.

**Mechanism:** Signed envelope includes all digests (plan, policy, executor, snapshot).

**Test:** Change ActionSpec after approve → run rejected.

**Metric:** `stale_approval_rejected_total`.

**Runbook:** approval-invalidated.md

---

## INV-09 No self-approval cycle

**Statement:** Control Plane cannot approve own release.

**Mechanism:** External T0 + separate release identity.

**Test:** Self-release plan → policy deny.

**Metric:** `self_approval_attempts_blocked`.

**Runbook:** self-hosting-cycle.md

---

## INV-10 Bootstrap trust termination

**Statement:** Verifier uses T0 key outside verified manifest.

**Mechanism:** seed-public-keys/ not from manifest under test.

**Test:** Manifest with embedded only key → FAIL without seed.

**Metric:** bootstrap_verify_pass on clean install.

**Runbook:** bootstrap-trust.md

---

## INV-11 Privacy before export

**Statement:** Telemetry scrubbed before collector export.

**Mechanism:** Allowlist schema; DLP canary tests.

**Test:** Canary secret in payload → dropped + alert.

**Metric:** `dlp_canary_leak_total` = 0.

**Runbook:** telemetry-leak.md

---

## INV-12 LLM not gate classifier

**Statement:** Release gate uses deterministic change classifier only.

**Mechanism:** LLM labels → review queue; gate reads classifier version.

**Test:** LLM-only label → gate ignores.

**Metric:** `llm_gate_bypass_attempts` = 0.

**Runbook:** change-classification.md

---

## Machine-checkable summary (protocol invariants)

См. также [`../SPEC/invariants.md`](../SPEC/invariants.md) для полного списка 18 protocol rules из GLT 2.0.
