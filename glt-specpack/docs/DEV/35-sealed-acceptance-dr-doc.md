---
id: glt.dev.35
owner: engineering
normativity: normative
status: planned
wave: 4
depends_on:
  - glt.dev.34
spec_refs:
  - ../EXPERIMENTS/safety-gate.md
  - ../EXPERIMENTS/holdout-cases.yaml
  - ../SECURITY/supply-chain.md
  - ../SECURITY/threat-model.md
  - ../SECURITY/sandbox.md
  - ../SPEC/self-hosting.md
  - ../SPEC/architecture.md
  - ../SPEC/cli.md
  - ../SPEC/events.md
  - ../SPEC/structural-invariants.md
  - ../OBSERVABILITY/runbooks/disaster-recovery.md
  - ../PDA/04-invariants.md
risk: medium
gate: safety
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/EXPERIMENTS/safety-gate.md
    authority: experiment-rubric
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/EXPERIMENTS/holdout-cases.yaml
    authority: experiment-rubric
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/supply-chain.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/threat-model.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/sandbox.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/self-hosting.md
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
    path: glt-specpack/docs/SPEC/events.md
    authority: event-registry
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/OBSERVABILITY/runbooks/disaster-recovery.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 35 — Sealed acceptance и DR

**Волна:** 4 · **Риск:** средний · **Gate:** safety

## Что делаем

- Release bundle и документ по восстановлению

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [ ] Safety gate пройден: T1–T10 задокументированы, E06 100% блокирован, INV-07…10 зелёные на staging
- [ ] Ни один placeholder не дожил до релиза: verifier digest, witness endpoint, golden digests
- [ ] `release_trust_roots.allowed` не пуст, dev-only ключ отвергается
- [ ] Holdout H01–H05 пройден и не использовался для настройки параметров
- [ ] DR-процедура описана настолько, чтобы её выполнил не автор

### Общее

- [ ] CI зелёный на всех шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [safety-gate.md](../EXPERIMENTS/safety-gate.md)

`admitSealedRelease` вызывает `admitRelease`, затем отвергает пустой
или запрещённый trust root (INV-10) и leftover placeholder
(PROTO-10). `glt-dev-only-2026` не корень. Живой `allowed` может
остаться пустым: тогда печать падает. `trust/` и схемы не правятся.
Holdout H01–H05 не калибрует параметры. DR —
[disaster-recovery.md](../OBSERVABILITY/runbooks/disaster-recovery.md).
Команды `glt` не добавляются.

## Статус

запланирован
