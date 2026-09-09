---
id: glt.dev.05
owner: engineering
normativity: normative
status: accepted
wave: 1
depends_on:
  - glt.dev.02
  - glt.dev.03
spec_refs:
  - ../SPEC/provenance.md
  - ../SPEC/cli.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../OBSERVABILITY/runbooks/authority-conflict.md
  - ../../trust/authority-map.yaml
risk: high
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/provenance.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/trust/authority-map.yaml
    authority: governance-normativity
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 05 — Enforcement authority map

**Волна:** 1 · **Риск:** высокий · **Gate:** нет

## Что делаем

- CI-проверка `trust/authority-map.yaml`

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Два владельца одного класса фактов роняют проверку (sheet INV-01)
- [x] Нормативный документ с `owner` вне authority map роняет проверку
- [x] Один путь, заявленный двумя классами фактов, роняет проверку
- [x] Конфликт даёт `source_conflict` и блокирует действия выше `read`, а не «выбирает правильный источник»

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

### Чем проверить

```bash
pnpm lint:authority
```

Рабочий вход — скрипт `lint:authority` в корневом `package.json` (через `tsx`).
То же: `pnpm glt lint authority`. Код конфликта — 6, не 2 и не 3.

## Спецификация

- [provenance.md](../SPEC/provenance.md)
- [cli.md](../SPEC/cli.md)
- [invariants.md](../SPEC/invariants.md)
- [04-invariants.md](../PDA/04-invariants.md) — sheet INV-01
- [authority-conflict.md](../OBSERVABILITY/runbooks/authority-conflict.md)
- [authority-map.yaml](../../trust/authority-map.yaml)

## Статус

**сделано** — ветка `wave1`. `glt lint authority` проверяет INV-01: один владелец на класс фактов, нормативный `owner` только из карты, один путь не принадлежит двум владельцам. Конфликт — `source_conflict`, действия выше `read` блокируются; правило `registry_vs_engineering` победителя не выбирает. Код 6, не 2 и не 3.

Негатив: два владельца одного класса, owner вне map, путь у двух классов. Живая карта не правилась. CI — шаг `authority map`.
