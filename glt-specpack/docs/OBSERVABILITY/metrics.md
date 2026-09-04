---
id: glt.doc.observability.metrics
owner: reliability
normativity: normative
status: accepted
depends_on:
  - glt.doc.pda.feedback-loops
source_refs: []
---

# Metrics

## Stability (primary)

| Metric | Type | Labels |
|---|---|---|
| `glt_snapshot_compile_errors_total` | counter | boundary |
| `glt_impact_compute_duration_seconds` | histogram | boundary |
| `glt_authority_violations_total` | counter | — |
| `glt_audit_chain_verify_failures` | counter | — |
| `glt_runner_unknown_outcome_total` | counter | action |
| `glt_witness_staleness_seconds` | gauge | — |
| `glt_freshness_stale_nodes` | gauge | snapshot |
| `glt_dlp_canary_leak_total` | counter | — |

## Effectiveness (experiments)

| Metric | Use |
|---|---|
| `glt_task_time_seconds` | E01 |
| `glt_check_recall` | E02 |
| `glt_false_green_total` | E03 |

## Build (structural integrity)

Слой «Сборка» измеряет целостность кодовой базы, а не поведение продукта. Источник — [`../SPEC/structural-invariants.md`](../SPEC/structural-invariants.md).

| Metric | Type | Значение | Норма |
|---|---|---|---|
| `glt_structural_coverage` | gauge | доля ID из реестров инвариантов, имеющих тест: `тесты с ID / всего ID` | 1.0; отклонение — долг по S-7 |
| `glt_boundary_violations_total` | counter | отклонённые попытки нарушить границы слоёв и контекстов | не ноль сам по себе не инцидент |
| `glt_duplicate_implementations` | gauge | механизмы из реестра, реализованные более одного раза | 0 (S-4) |
| `glt_registry_drift` | gauge | `event_type`, встречающиеся в коде мимо реестра | 0 (S-3) |
| `glt_import_cycles` | gauge | циклы в графе импортов | 0 (S-6) |
| `glt_graph_change_lead_time` | histogram | время от запроса на расширение графа до решения архитектора | метрика организации, см. ниже |

`glt_boundary_violations_total` отличается от инцидента: это **отклонённые** попытки. Устойчиво ненулевое значение на одной границе означает, что граница проведена не по реальному шву, а не что исполнитель плохо работает.

`glt_graph_change_lead_time` измеряет узкое место организации, а не качество кода. На дашборд устойчивости продукта не выносится — см. [`../00-governance/parallel-work.md`](../00-governance/parallel-work.md).

### Исходная линия 0.3.0

Кода нет, поэтому: `structural_coverage` = 0 при 40 ID в реестрах (18 PROTO + 12 INV + 10 S), `registry_drift` = 0 при 10 событиях в реестре и 0 в коде, остальные — 0. Стартовый аудит одной строкой: **40 инвариантов в реестрах, 0 в тестах, 0 событий мимо реестра.**

## OTel

Resource: `service.name=glt-controlplane`, attributes `glt.registry_version`, `glt.snapshot_id`.
