---
id: glt.dev.27
owner: engineering
normativity: normative
status: accepted
wave: 3
depends_on:
  - glt.dev.26
spec_refs:
  - ../SPEC/self-hosting.md
  - ../SPEC/architecture.md
  - ../SPEC/policy.md
  - ../SPEC/cli.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../PDA/08-experiments.md
  - ../OBSERVABILITY/metrics.md
  - ../SECURITY/approvals.md
risk: high
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/self-hosting.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/policy.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/08-experiments.md
    authority: experiment-rubric
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/OBSERVABILITY/metrics.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/approvals.md
    authority: policy-approval
    role: derived-from
---

# 27 — Dogfood собственной топологии

**Волна:** 3 · **Риск:** высокий · **Gate:** нет

## Что делаем

- Контрол-плейн наблюдает свой репозиторий через `registry/glt-controlplane.yaml`
- Seeded drift обнаруживается, время до обнаружения измеряется (E05)
- Самонаблюдение не одобряет релиз (INV-09)

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] GLT описывает себя через `registry/glt-controlplane.yaml`
- [x] Seeded drift обнаруживается, время до обнаружения измеряется (E05)
- [x] Самонаблюдение не даёт контрол-плейну одобрять себя (sheet INV-09)

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [self-hosting.md](../SPEC/self-hosting.md)

Предмет наблюдения — этот репозиторий. Описание — существующий бандл,
не второй реестр. `observeSelfTopology` классифицирует pin через
`classifyDeployDrift` и всегда ставит `grants_approve: false`.
`detect_seconds` приходит уже в секундах. Команды `glt` не добавляются.

## Статус

**сделано** — ветка `wave3`. Самонаблюдение через бандл; seeded drift засекается; approve не выдаётся. CI: [run](https://github.com/Quantum-Insight-Lab/glt/actions/runs/35051782645).
