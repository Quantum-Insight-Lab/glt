---
id: glt.dev.28
owner: engineering
normativity: normative
status: accepted
wave: 3
depends_on:
  - glt.dev.27
spec_refs:
  - ../SECURITY/external-witness.md
  - ../SPEC/self-hosting.md
  - ../SPEC/degradation.md
  - ../SPEC/audit.md
  - ../SPEC/architecture.md
  - ../SPEC/cli.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../OBSERVABILITY/runbooks/witness-stale.md
risk: high
gate: anti-cycle
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/external-witness.md
    authority: bootstrap-trust
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/self-hosting.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/degradation.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/audit.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
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
    path: glt-specpack/docs/OBSERVABILITY/runbooks/witness-stale.md
    authority: engineering-contract
    role: derived-from
---

# 28 — Интеграция внешнего witness

**Волна:** 3 · **Риск:** высокий · **Gate:** anti-cycle

## Что делаем

- Клиент внешнего witness: POST head-hash, сохранить receipt
- P06 → read-only; `example.invalid` отвергается
- Anti-cycle: локальная verify цепочки не является анкором

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Head-hash анкорится у третьей стороны, receipt сохраняется
- [x] Устаревание witness сверх P06 переводит систему в read-only
- [x] Endpoint реальный, а не `example.invalid`
- [x] Gate anti-cycle: контрол-плейн не подтверждает целостность своего audit сам

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [external-witness.md](../SECURITY/external-witness.md)

`assessWitnessFreshness` зовёт `snapshotIsStale`. `anchorHead` ходит в
сеть. `WITNESS_ENDPOINT` снаружи Compose. `trust/` не правится.
Команды `glt` не добавляются.

## Статус

**сделано** — ветка `wave3`. Клиент анкорит head-hash у третьей стороны и сохраняет receipt; P06 — read-only; `example.invalid` отвергается; локальная verify цепочки не witness. CI: [run](https://github.com/Quantum-Insight-Lab/glt/actions/runs/35053528032).
