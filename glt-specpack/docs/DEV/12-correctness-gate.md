---
id: glt.dev.12
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on:
  - glt.dev.10
  - glt.dev.11
spec_refs:
  - ../SPEC/impact.md
  - ../EXPERIMENTS/product-gate.md
  - ../EXPERIMENTS/seeded-failures.md
  - ../EXPERIMENTS/seeded-changes.yaml
  - ../EXPERIMENTS/holdout-cases.yaml
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
  - ../SPEC/audit.md
  - ../PDA/04-invariants.md
  - ../../parameters/snapshot-stale-after.yaml
  - ../../contracts/propagation/propagation-matrix.yaml
risk: medium
gate: correctness
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/EXPERIMENTS/product-gate.md
    authority: experiment-rubric
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/EXPERIMENTS/seeded-changes.yaml
    authority: experiment-rubric
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/EXPERIMENTS/holdout-cases.yaml
    authority: experiment-rubric
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/impact.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/audit.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/parameters/snapshot-stale-after.yaml
    authority: parameter-values
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/propagation/propagation-matrix.yaml
    authority: impact-propagation-rules
    role: derived-from
---

# 12 — Correctness gate

**Волна:** 1 · **Риск:** средний · **Gate:** correctness

## Что делаем

- Стенд для E02a и E02b: recall против набора seeded changes
- Прогон E03 по holdout H01–H05
- Проверка E05a: честность границ
- Отчёт gate: recall, precision, размер набора, версии classifier и matrix

## Критерии

Полностью машинные. Ни один критерий не сравнивается с человеческим baseline.

| Критерий | Порог |
|---|---|
| E02a recall обязательных проверок | 1.0 |
| E02b recall затронутых узлов | 1.0 |
| E03 false green на holdout | 0 |
| E05a `known_unknowns` вне boundary | всегда непусто |

Гейтится **recall**, precision публикуется. Лишний узел в отчёте стоит
разработчику времени на чтение; пропущенная обязательная проверка — это тот
отказ, ради предотвращения которого GLT существует. Симметричный порог уравнял
бы эти два исхода, а они не равны.

Порог recall равен 1.0, а не 0.8. Мягкий порог означает «иногда молча теряем
обязательную проверку», что противоречит PROTO-12 и всей логике
`known_unknowns`: неполнота обязана быть **названной**, а не статистической.

Измеряется recall на авторизованном наборе DEV-11 (`glt.seeded-slice@1`): это
единственный граф с ручной ground truth на все восемь классов и семь отношений
матрицы. Четырёхузловой bootstrap-срез для E02 не используется. Intended
мета-граф `glt.controlplane-intended@1` компилируется как стенд (E05a вне его
границы) и обязан быть крупнее среза.

## Чего этот gate не доказывает

Он доказывает, что GLT считает правильно. Он ничего не говорит о том, ускоряет
ли GLT чью-то работу — это Usefulness gate, отложенный со статусом **«не
проверено»**, потому что требует минимум четырёх участников, не писавших граф.

Прохождение этого gate не даёт права утверждать что-либо о скорости или
продуктивности. См. [product-gate.md](../EXPERIMENTS/product-gate.md).

UI не участвует. B1 dashboard перенесён в DEV-20, где существуют обе плоскости и
есть что показывать.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым.

### Критерии

- [ ] E02a: recall обязательных проверок равен 1.0 на всём наборе
- [ ] E02b: recall затронутых узлов равен 1.0 на всём наборе
- [ ] E03: ноль false-green на holdout H01–H05
- [ ] E05a: изменение вне boundary всегда даёт непустой `known_unknowns`
- [ ] Precision посчитана и опубликована, но не гейтится

### Честность прогона

- [ ] Прогон идёт на мета-графе, а не на четырёхузловом срезе
- [ ] Holdout не использовался для отладки и настройки параметров
- [ ] Отчёт называет размер набора и версии classifier и matrix
- [ ] Отчёт нигде не утверждает, что GLT ускоряет работу
- [ ] Usefulness gate остаётся в статусе «не проверено», а не «пройден»

### Общее

- [ ] CI зелёный на шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [impact.md](../SPEC/impact.md)
- [product-gate.md](../EXPERIMENTS/product-gate.md)
- [seeded-changes.yaml](../EXPERIMENTS/seeded-changes.yaml)
- [holdout-cases.yaml](../EXPERIMENTS/holdout-cases.yaml)
- [audit.md](../SPEC/audit.md)

## Статус

в дереве; чеклист не отмечен до живой приёмки
