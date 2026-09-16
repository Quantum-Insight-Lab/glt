---
id: glt.dev.30
owner: engineering
normativity: normative
status: accepted
wave: 4
depends_on:
  - glt.dev.29
spec_refs:
  - ../SPEC/policy.md
  - ../SECURITY/approvals.md
  - ../SPEC/runner.md
  - ../SPEC/architecture.md
  - ../SPEC/api.md
  - ../SPEC/events.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
risk: high
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/policy.md
    authority: policy-approval
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/approvals.md
    authority: policy-approval
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/runner.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/api.md
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
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 30 — Брокер политики и подтверждений

**Волна:** 4 · **Риск:** высокий · **Gate:** нет

## Что делаем

- Поток approval

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Изменение любого поля envelope аннулирует approval (PROTO-15)
- [x] Политика перепроверяется непосредственно перед запуском, а не только при подтверждении
- [x] Runner не может одобрить сам себя
- [x] Risk вычисляется из capabilities, а не из названия действия

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [policy.md](../SPEC/policy.md)
- [approvals.md](../SECURITY/approvals.md)

`approvePlan` вяжет актора к approval envelope подписью Ed25519
(`verifyBytes`, S-4). Envelope — девять полей из policy.md; печать —
`digestOf`. Смена любого поля, включая байты ActionSpec, — PROTO-15 /
INV-08. `admitApprovedPlan` заново собирает envelope, проверяет подпись
и вызывает `authorize` ещё раз. Риск — `riskFromCapabilities`; имя
действия не вход. Событие `glt.plan.approved` уже в реестре. `registry/`
и схемы не правятся. Команды `glt` не добавляются. `/v1/actions` нет.

## Статус

**сделано** — ветка `wave4`. Envelope и байты ActionSpec в печати; смена аннулирует approval; `authorize` снова на admit; риск из capabilities. CI: [run](https://github.com/Quantum-Insight-Lab/glt/actions/runs/35056566728).
