---
id: glt.doc.pda.blueprint
owner: product-architecture
normativity: normative
status: accepted
depends_on:
  - glt.doc.governance.pre-code-gate
  - glt.doc.pda.control-surfaces
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "section:6"
    authority: engineering-contract
    role: informative
---

# PDA Step 6 — Architectural Blueprint

Event Core + Domain Layer + Stability Engine + projections.

---

## Component diagram

```mermaid
flowchart TB
    subgraph Presentation
        CLI[CLI]
        DASH[Dashboard B1/G]
    end

    subgraph Domain
        REG[Registry Compiler]
        SNAP[Snapshot Compiler]
        IMP[Impact Engine]
        STATE[State Evaluator]
        PLAN[Action Planner]
        POL[Policy Engine]
    end

    subgraph Stability
        AUD[Audit Store]
        RUN[Runner Sandbox]
        WIT[External Witness Client]
    end

    subgraph Observation
        COL_GIT[Git Collector]
        COL_CI[CI Collector]
        COL_OTEL[OTel Collector]
    end

    CLI --> IMP
    DASH --> STATE
    REG --> SNAP
    COL_GIT --> SNAP
    COL_CI --> SNAP
    COL_OTEL --> STATE
    SNAP --> IMP
    SNAP --> STATE
    IMP --> PLAN
    PLAN --> POL
    POL --> RUN
    RUN --> AUD
    WIT --> AUD
```

---

## Event Core (v1 minimal)

Append-only events for audit and replay:

- `ChangeSubmitted`, `SnapshotCompiled`, `ImpactComputed`
- `GateEvaluated`, `PlanApproved`, `ActionStarted`, `ActionCompleted`
- `AuditAppended`, `WitnessAnchored`

Full event catalog: [`../SPEC/events.md`](../SPEC/events.md).

---

## Domain Layer

Pure functions where possible:

- `resolve(alias, registry_version)`
- `compile_snapshot(sources, as_of)`
- `compute_impact(snapshot, change, boundary)`
- `evaluate_state(snapshot, observations)`
- `build_plan(request, action_specs)`

Validators co-located; no I/O in domain pure core.

---

## Stability Engine

- Policy broker (deny default)
- Approval broker (external for self-release)
- Runner isolation (VM/rootless container)
- Audit hash chain
- DLP on telemetry path

---

## Integration boundaries

| Boundary | Protocol | Direction |
|---|---|---|
| Git | read-only clone | in |
| CI | webhook + artifacts | in |
| OTel | gRPC/HTTP export | in |
| Witness | signed receipt API | out |
| User | CLI + HTTPS API | in |

No direct DB write from runner v1.

---

## Deployment v1

- **Wave 1–2:** CLI + static files + optional local SQLite for snapshots
- **Wave 3:** Compose: api + postgres + redis + otel-collector
- **Wave 4:** Runner as separate worker pool

---

## Self-hosting topology

GLT describes itself in `registry/glt-controlplane.yaml`. Bootstrap slice first; expand after DEV-21.

См. [`../SPEC/self-hosting.md`](../SPEC/self-hosting.md).
