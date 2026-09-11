---
id: glt.dev.20
owner: engineering
normativity: normative
status: accepted
wave: 2
depends_on:
  - glt.dev.19
spec_refs:
  - ../SPEC/collectors.md
  - ../SPEC/dashboard.md
  - ../SPEC/snapshots.md
  - ../SPEC/architecture.md
  - ../SPEC/topology.md
  - ../SPEC/structural-invariants.md
  - ../../parameters/dashboard-max-nodes.yaml
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/collectors.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/dashboard.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/snapshots.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/topology.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/parameters/dashboard-max-nodes.yaml
    authority: parameter-values
    role: derived-from
---

# 20 — Приёмка build-плоскости и B1 dashboard

**Волна:** 2 · **Риск:** средний · **Gate:** нет

## Что делаем

- Build-плоскость: intended в `nodes[]`, materialized — pin коллектора, не merge
- B1 dashboard, режим Change, только чтение. Глифы выключены. Команды `glt` не расширяются.

## Почему dashboard именно здесь

До версии 0.5.0 он был deliverable волны 1 и обосновывался Product gate. Этот
gate разделён: Correctness gate машинный и UI не использует, а Usefulness gate
отложен до появления минимум четырёх человек, не писавших граф.

Строить интерфейс, ценность которого невозможно измерить, до того как доказана
корректность на графе реального размера — это ровно тот «dashboard theatre»,
против которого написан весь пакет. К DEV-20 существуют обе плоскости, поэтому
переключателю `Intended / Build / Combined` есть что переключать, а drift между
ними видно — это первое, что показывает карта и не показывает CLI.

Только режим Change. Слой глифов остаётся заблокированным: он зависит от E04,
который принадлежит отложенному gate.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым.

### Build-плоскость

- [x] Intended и materialized хранятся раздельно и сравниваются
- [x] Drift между плоскостями отображается как отдельный класс, а не как поломка
- [x] Snapshot остаётся детерминированным после добавления build-фактов

### Dashboard

- [x] Dashboard ничего не пишет, кроме запросов действий через API (S-5)
- [x] Ручная правка статуса на дашборде невозможна
- [x] `unknown` визуально отличается от `healthy`
- [x] Цвет не единственный канал передачи смысла
- [x] Всё доступно с клавиатуры и читается скринридером
- [x] Слой глифов **не** включён: E04 не измерен
- [x] Каждый зелёный статус раскрывается в «на основании чего»

### Общее

- [x] CI зелёный на шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [collectors.md](../SPEC/collectors.md)
- [dashboard.md](../SPEC/dashboard.md)

## Статус

**сделано** — ветка `wave2`. Intended снимок пинит git, не сливает `nodes[]`. Change dashboard — только чтение, глифы выключены. CI: [run](https://github.com/Quantum-Insight-Lab/glt/actions/runs/34568191185).
