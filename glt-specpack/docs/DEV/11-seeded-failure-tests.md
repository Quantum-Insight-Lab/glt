---
id: glt.dev.11
owner: engineering
normativity: normative
status: planned
wave: 1
depends_on:
  - glt.dev.10
spec_refs:
  - ../EXPERIMENTS/seeded-failures.md
  - ../EXPERIMENTS/seeded-changes.yaml
  - ../EXPERIMENTS/product-gate.md
  - ../SPEC/impact.md
  - ../SPEC/invariants.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
  - ../../contracts/propagation/propagation-matrix.yaml
  - ../../trust/authority-map.yaml
risk: medium
gate: product-prep
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/EXPERIMENTS/seeded-failures.md
    authority: experiment-rubric
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/EXPERIMENTS/seeded-changes.yaml
    authority: experiment-rubric
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/impact.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/contracts/propagation/propagation-matrix.yaml
    authority: impact-propagation-rules
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

# 11 — Seeded-случаи

**Волна:** 1 · **Риск:** средний · **Gate:** product-prep

## Что делаем

- Инъекции дефектов S1–S3 в CI
- Набор seeded changes с ручной ground truth, не менее 10 случаев

## Два набора, а не один

S1–S3 — это инъекции дефектов: они проверяют, что механизм **срабатывает**, и
исход у них бинарный. Recall на них не считается: у инъекции нет «набора
затронутых узлов».

Correctness gate измеряет именно recall, поэтому нужен второй набор — изменения
без дефекта, у каждого свой правильный ответ, выведенный **вручную** по матрице
и графу. Ответ, полученный измеряемым инструментом, — это тавтология, а не
эталон.

Требования, формат случая и правила ревью:
[seeded-failures.md](../EXPERIMENTS/seeded-failures.md).

Набор открыт, в отличие от holdout H01–H05, и отлаживать impact engine на нём
разрешено.

## Известное ограничение

Спецификация требует, чтобы набор ревьюила роль, не писавшая propagation matrix:
автор матрицы, заверяющий ground truth для собственной матрицы, замыкает
проверку на себя.

**При одном исполнителе это требование невыполнимо.** Это тот же дефект, из-за
которого разделён Product gate. Решение на этом шаге: ground truth выведена
по SPEC и id рёбер/строк матрицы (не прогоном engine), ограничение записано
в [`seeded-changes.yaml`](../EXPERIMENTS/seeded-changes.yaml) как
`independent_review.status: limitation-recorded`. Набор не выдаётся за
независимо заверенный. Молча заверить самому себе — не вариант.

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым.

### Инъекции S1–S3

- [ ] S1: удаление ребра `validates` роняет gate
- [ ] S2: узел за пределами boundary даёт непустой `known_unknowns`
- [ ] S3: дублирование владельца класса фактов роняет verifier
- [ ] Все три автоматизированы в CI, а не выполняются вручную

### Набор seeded changes

- [ ] Не менее 10 случаев
- [ ] Покрыты все восемь change classes
- [ ] Покрыты все отношения, у которых есть строка в матрице
- [ ] Не менее двух случаев выходят за boundary
- [ ] Не менее одного случая на непокрытое отношение из `uncovered_relations`
- [ ] У каждого случая есть rationale со ссылками на id рёбер и строки матрицы
- [ ] Ground truth выведена вручную, а **не** прогоном impact engine
- [ ] Вопрос независимого ревью решён явно, а не обойдён

### Общее

- [ ] CI зелёный на шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [seeded-failures.md](../EXPERIMENTS/seeded-failures.md)

## Статус

в дереве; чеклист не отмечен до живой приёмки
