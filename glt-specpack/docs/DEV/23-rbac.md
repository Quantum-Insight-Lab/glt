---
id: glt.dev.23
owner: engineering
normativity: normative
status: planned
wave: 3
depends_on:
  - glt.dev.21
spec_refs:
  - ../SPEC/policy.md
  - ../SPEC/api.md
  - ../SPEC/architecture.md
  - ../SPEC/self-hosting.md
  - ../SECURITY/approvals.md
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
    path: glt-specpack/docs/SPEC/api.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/self-hosting.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/approvals.md
    authority: policy-approval
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

# 23 — RBAC

**Волна:** 3 · **Риск:** высокий · **Gate:** нет

## Что делаем

- Аутентификация и разграничение доступа
- Deny by default. `read` и `request_action` разделены. Автор плана не одобряет сам себя (INV-09)
- Команды `glt` не расширяются. В копию никто не пишет

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Запрет по умолчанию: неизвестная роль не получает ничего
- [x] Роль не может одобрить собственный plan (sheet INV-09)
- [x] Права на чтение и на запрос действия разделены

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [policy.md](../SPEC/policy.md)
- [api.md](../SPEC/api.md)

## Статус

запланирован
