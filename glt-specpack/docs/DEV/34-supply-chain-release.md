---
id: glt.dev.34
owner: engineering
normativity: normative
status: accepted
wave: 4
depends_on:
  - glt.dev.33
spec_refs:
  - ../SECURITY/supply-chain.md
  - ../SPEC/self-hosting.md
  - ../SPEC/architecture.md
  - ../SPEC/policy.md
  - ../SECURITY/approvals.md
  - ../SPEC/cli.md
  - ../SPEC/events.md
  - ../SPEC/runner.md
  - ../SPEC/snapshots.md
  - ../SPEC/structural-invariants.md
  - ../SECURITY/sandbox.md
  - ../SECURITY/threat-model.md
  - ../PDA/04-invariants.md
risk: high
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/supply-chain.md
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
    path: glt-specpack/docs/SPEC/policy.md
    authority: policy-approval
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/approvals.md
    authority: policy-approval
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
    path: glt-specpack/docs/SPEC/runner.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/snapshots.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/sandbox.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/threat-model.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 34 — Supply chain и релиз

**Волна:** 4 · **Риск:** высокий · **Gate:** нет

## Что делаем

- Подписанные образы, закреплённые digests

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Образы подписаны, digests закреплены
- [x] Сборка воспроизводима из закреплённых входов
- [x] Релиз требует внешнего approval, `glt-cp-runtime@internal` запрещён

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [supply-chain.md](../SECURITY/supply-chain.md)

`admitRelease` — единственный гейт релиза (S-4). Домен чистый (S-1):
refs, подписи и политика приходят разобранными; образ не собирается
и не пушится. Pin — `name@sha256:` + 64 hex (`isPinnedImageRef`,
PROTO-10). Подпись — `verifyBytes` над `digestOf({ ref, digest })`
(PROTO-14). Входы — digests lockfile / FROM / schemas / source; повтор
обязан совпасть (`digestOf`, PROTO-03). Approval — `authorize` с
`affects_control_plane_release`; `glt-cp-runtime@internal` запрещён
(INV-09). `release_trust_roots.allowed` не заполняется (DEV-35).
`registry/` и схемы не правятся. Команды `glt` не добавляются.

## Статус

**сделано** — ветка `wave4`. Образы pinned и подписаны; входы воспроизводятся; runtime не одобряет. CI: [run](https://github.com/Quantum-Insight-Lab/glt/actions/runs/35064245269).
