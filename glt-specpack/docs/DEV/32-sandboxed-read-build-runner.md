---
id: glt.dev.32
owner: engineering
normativity: normative
status: planned
wave: 4
depends_on:
  - glt.dev.31
spec_refs:
  - ../SECURITY/sandbox.md
  - ../SPEC/runner.md
  - ../SPEC/architecture.md
  - ../SPEC/events.md
  - ../SPEC/cli.md
  - ../SPEC/audit.md
  - ../SPEC/structural-invariants.md
  - ../EXPERIMENTS/seeded-failures.md
  - ../EXPERIMENTS/safety-gate.md
  - ../PDA/04-invariants.md
risk: critical
gate: safety-prep
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/sandbox.md
    authority: engineering-contract
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
    path: glt-specpack/docs/SPEC/events.md
    authority: event-registry
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/audit.md
    authority: audit-chain
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/EXPERIMENTS/seeded-failures.md
    authority: experiment-rubric
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/EXPERIMENTS/safety-gate.md
    authority: experiment-rubric
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 32 — Sandboxed read/build runner

**Волна:** 4 · **Риск:** критический · **Gate:** safety-prep

## Что делаем

- Исполнитель в контейнере с deny по умолчанию

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [ ] Escape-сценарии E06 блокируются полностью, 100%
- [ ] Сеть выключена по умолчанию, egress только через policy broker
- [ ] Код проверяемой ветки считается недоверенным
- [ ] Нет Docker socket, нет host credentials, образ закреплён подписанным digest
- [ ] Seeded failures S4–S6 автоматизированы

### Общее

- [ ] CI зелёный на всех шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [sandbox.md](../SECURITY/sandbox.md)

`admitSandbox` — единственный гейт изоляции (S-4). Домен чистый (S-1):
профиль приходит уже разобранным, контейнер не порождается, копия не
пишется. Сеть `off`, пока брокер не дал grant. Ветка `untrusted`.
Образ — digest конверта. E06.1–6 отвергаются (`INV-06`). S4–S6 —
инъекции в CI. Событие `glt.action.completed` уже в реестре.
`registry/` и схемы не правятся. Команды `glt` не добавляются.
Receipts — DEV-33.

## Статус

запланирован
