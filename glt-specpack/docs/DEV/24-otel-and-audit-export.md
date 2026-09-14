---
id: glt.dev.24
owner: engineering
normativity: normative
status: planned
wave: 3
depends_on:
  - glt.dev.22
spec_refs:
  - ../OBSERVABILITY/metrics.md
  - ../SPEC/collectors.md
  - ../SPEC/audit.md
  - ../SPEC/events.md
  - ../SECURITY/privacy.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/collectors.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/audit.md
    authority: audit-chain
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

# 24 — OTel и экспорт audit

**Волна:** 3 · **Риск:** средний · **Gate:** нет

## Что делаем

- Метрики и экспорт audit-цепочки
- Публикация метрик слоя «Сборка». Скруб до экспорта. `glt.audit.appended` из реестра
- Команды `glt` не расширяются. В копию никто не пишет

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Метрики слоя «Сборка» из `metrics.md` действительно публикуются
- [x] Телеметрия очищается до экспорта, canary-тест ловит утечку (sheet INV-11)
- [x] Сырые персональные данные не попадают в traces (PROTO-18)

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [metrics.md](../OBSERVABILITY/metrics.md)
- [collectors.md](../SPEC/collectors.md)
- [audit.md](../SPEC/audit.md)

## Статус

запланирован
