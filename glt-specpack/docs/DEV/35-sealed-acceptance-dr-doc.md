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
risk: medium
gate: safety
source_refs: []
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

## Статус

запланирован
