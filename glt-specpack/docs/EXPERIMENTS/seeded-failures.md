---
id: glt.doc.experiments.seeded-failures
owner: product-research
normativity: normative
status: accepted
depends_on:
  - glt.doc.experiments.rubric
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/EXPERIMENTS/holdout-cases.yaml
    authority: experiment-rubric
    role: derived-from
---

# Seeded cases

Два разных набора. Их путали до 0.5.0, и из-за этого Correctness gate не имел, чем измерять recall.

## 1. Seeded failures — инъекции дефектов

Синтетические неисправности в CI и staging, не в production. Проверяют, что механизм **срабатывает**.

| Seed | Injection | Expected detection |
|---|---|---|
| S1 | Drop validates edge in test registry | Gate fail |
| S2 | Extra node outside boundary in change | known_unknowns |
| S3 | Duplicate authority owner in test map | Verifier fail |
| S4 | Backdate snapshot timestamp | Freshness stale |
| S5 | Flip audit prev_hash | Verify fail |
| S6 | Runner bind mount /etc | Sandbox deny |

Автоматизация: S1–S3 на DEV-11, S4–S6 на DEV-32.

Это бинарные проверки: сработало или нет. Recall на них не считается — у инъекции нет «набора затронутых узлов».

## 2. Seeded changes — набор для recall

Изменения без дефекта, у каждого **авторизованный правильный ответ**. Это то, чем измеряются E02a и E02b.

Формат случая:

```yaml
- id: C01
  change:
    paths: [docs/SPEC/registry.md]
    labels: [interface]
  ground_truth:
    affected_nodes: [...]      # полный набор, не пример
    required_checks: [...]     # полный набор
    known_unknowns_expected: false
  authored_by: <role>
  rationale: почему именно эти узлы, со ссылкой на рёбра и строки матрицы
```

Требования к набору:

1. **Не менее 10 случаев**, покрывающих все восемь change classes и все семь отношений, у которых есть строка в матрице.
2. **Ground truth выводится вручную по матрице и графу**, а не прогоном impact engine. Ответ, полученный измеряемым инструментом, не является ground truth — это тавтология.
3. **Каждый случай несёт rationale** со ссылками на id рёбер и строки матрицы. Случай без обоснования нельзя ни проверить, ни оспорить.
4. **Не менее двух случаев выходят за boundary** — для E05a.
5. **Не менее одного случая на непокрытое отношение** из `uncovered_relations` — ожидаемый результат содержит `known_unknowns` с `kind: uncovered_relation`.
6. Набор ревьюит роль, не писавшая матрицу. Автор матрицы, авторизующий ground truth для собственной матрицы, замыкает проверку на себя.

Набор авторизуется на DEV-11 и версионируется. Он **не** holdout: он открыт, и по нему разрешено отлаживать impact engine. Holdout H01–H05 остаётся закрытым и используется только для E03.

## Почему набор нельзя сделать на bootstrap-срезе

Четыре узла и три ребра дают правильный ответ, видимый глазами. Recall на таком наборе равен 1.0 у любой реализации, включая неправильную, и метрика не различает ничего.

Correctness gate требует расширенного intended мета-графа как отдельного boundary — см. DEV-09. Это чистые данные: коллекторы для intended-плоскости не нужны.
