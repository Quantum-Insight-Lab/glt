---
id: glt.doc.spec.index
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.governance.pre-code-gate
  - glt.doc.pda.blueprint
source_refs: []
---

# SPEC — инженерная спецификация GLT Control Plane

Универсальное ядро без adopter-зависимостей. ÆON — только [`../../examples/targets/aeon/`](../../examples/targets/aeon/).

---

## Индекс

| Документ | Тема |
|---|---|
| [architecture.md](architecture.md) | Компоненты, границы, стек |
| [cli.md](cli.md) | Команды, флаги, exit codes, определённость вывода |
| [registry.md](registry.md) | ID, aliases, ActionSpec |
| [provenance.md](provenance.md) | SourceRef, authority, planes |
| [topology.md](topology.md) | Node, Edge, state axes |
| [snapshots.md](snapshots.md) | Compile, determinism, versioning |
| [collectors.md](collectors.md) | Intent, build, runtime |
| [impact.md](impact.md) | Change/incident propagation |
| [gates.md](gates.md) | Check, Gate, delivery |
| [runner.md](runner.md) | Plan, policy, sandbox v1 |
| [dashboard.md](dashboard.md) | B1/G UI, glyph layer |
| [self-hosting.md](self-hosting.md) | Bootstrap, witness, anti-cycle |
| [degradation.md](degradation.md) | Failure modes |
| [invariants.md](invariants.md) | 18 protocol rules, `PROTO-xx` |
| [structural-invariants.md](structural-invariants.md) | Инварианты сборки `S-x` |
| [events.md](events.md) | Event Core catalog |
| [policy.md](policy.md) | Allowlist, approvals |
| [audit.md](audit.md) | Hash chain, receipts |
| [parameters.md](parameters.md) | Parameter index |

---

## Wire contracts

JSON Schema 2020-12: [`../../contracts/schemas/`](../../contracts/schemas/).

---

## Bootstrap slice

`glt.bootstrap-slice@1`: RegistryEntry → Compiler → Check → Gate.

Meta-registry: [`../../registry/glt-controlplane.yaml`](../../registry/glt-controlplane.yaml).

---

## Versioning

- `apiVersion: glt.dev/v1alpha1` для Node/Edge
- Registry SemVer; entry `id@revision`
- Schema `$id` включает major version
