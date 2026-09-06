---
id: glt.dev.28
owner: engineering
normativity: normative
status: planned
wave: 3
depends_on:
  - glt.dev.27
spec_refs:
  - ../SECURITY/external-witness.md
risk: high
gate: anti-cycle
source_refs: []
---

# 28 — Интеграция внешнего witness

**Волна:** 3 · **Риск:** высокий · **Gate:** anti-cycle

## Что делаем

- Клиент внешнего witness

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [ ] Head-hash анкорится у третьей стороны, receipt сохраняется
- [ ] Устаревание witness сверх P06 переводит систему в read-only
- [ ] Endpoint реальный, а не `example.invalid`
- [ ] Gate anti-cycle: контрол-плейн не подтверждает целостность своего audit сам

### Общее

- [ ] CI зелёный на всех шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [external-witness.md](../SECURITY/external-witness.md)

## Статус

запланирован
