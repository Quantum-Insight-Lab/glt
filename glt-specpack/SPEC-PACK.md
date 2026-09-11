# SPEC-PACK.md — контракт пакета

Машиночитаемый и человекочитаемый контракт standalone specpack GLT.

```yaml
apiVersion: glt.dev/specpack/v1
kind: SpecPack
metadata:
  id: glt.specpack
  version: 0.27.0
  status: pre-code
  created: 2026-08-14
  revised: 2026-09-11
spec:
  product: Glyph Language for Topology — Control Plane
  methodology: PDA v1.2
  bootstrap_slice: glt.bootstrap-slice@1
  v1_capabilities:
    allowed:
      - inventory
      - validate
      - compile
      - typecheck
      - test
      - health
    forbidden:
      - self_write
      - commit
      - push
      - self_upgrade
      - deploy
  trust_termination: T0
  wire_format: JSON Schema 2020-12
  normativity_model: single-owner per fact class
```

---

## Обязательные артефакты

| Артефакт | Путь | Owner |
|---|---|---|
| Authority map | `trust/authority-map.yaml` | governance |
| Metadata contract | `docs/00-governance/metadata-contract.md` | governance |
| Pre-code gate | `docs/00-governance/pre-code-gate.md` | governance |
| PDA (8 шагов) | `docs/PDA/01-*.md` … `08-*.md` | product-architecture |
| SPEC index | `docs/SPEC/SPEC.md` | engineering |
| CLI surface | `docs/SPEC/cli.md` | engineering |
| Protocol invariants | `docs/SPEC/invariants.md` | engineering |
| Structural invariants | `docs/SPEC/structural-invariants.md` | engineering |
| Agent rules file | `AGENTS.md` (repo root) | engineering |
| Parallel work protocol | `docs/00-governance/parallel-work.md` | governance |
| JSON Schemas | `contracts/schemas/*.schema.json` | contracts |
| Propagation matrix | `contracts/propagation/propagation-matrix.yaml` | engineering |
| Event registry | `contracts/events/event-registry.yaml` | engineering |
| Meta-registry | `registry/glt-controlplane.yaml` | registry |
| Intended boundary | `registry/boundaries/controlplane-intended.yaml` | registry |
| Bootstrap manifest | `trust/bootstrap-manifest.yaml` | trust |
| DEV roadmap | `docs/DEV/README.md` + `01-35` | engineering |

---

## Metadata-контракт (кратко)

Каждый markdown-документ в `docs/` начинается с frontmatter:

```yaml
---
id: glt.doc.<area>.<name>
owner: <team-or-role>
normativity: normative | informative | non_normative
status: draft | review | accepted | deprecated
depends_on: [glt.doc.*]
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/registry.md
    role: derived-from
---
```

Полная спецификация: [`docs/00-governance/metadata-contract.md`](docs/00-governance/metadata-contract.md).

---

## Граф зависимостей документов

1. **Governance** (00-governance, trust/) — корень DAG.
2. **PRODUCT + PDA 01–05** — до pre-code gate.
3. **Pre-code gate** — блокирует SPEC и contracts.
4. **PDA 06–08 + SPEC** — после gate.
5. **SECURITY, OBSERVABILITY, EXPERIMENTS** — параллельно SPEC, ссылаются на invariants.
6. **DEV** — после SPEC index и schemas.
7. **examples/** — всегда non_normative, без обратных depends_on в core.

Generated-артефакты (snapshots, reports, dashboard state) **никогда** не входят в `depends_on` нормативных документов.

---

## Версионирование пакета

- **SemVer** для specpack: MAJOR — ломающие schema/registry; MINOR — новые узлы/collectors; PATCH — текст, примеры.
- **Revision** для registry entries: монотонное целое внутри `id`.
- **Schema version** в `$id` и `apiVersion` полях артеfactов.

---

## Критерии готовности к выносу

См. [`docs/00-governance/pre-code-gate.md`](docs/00-governance/pre-code-gate.md) и финальный todo `validate-specpack`.
