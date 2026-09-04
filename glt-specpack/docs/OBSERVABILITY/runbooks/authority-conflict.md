---
id: glt.doc.observability.runbook.authority-conflict
owner: reliability
normativity: informative
status: accepted
depends_on:
  - glt.doc.observability.runbooks-index
source_refs: []
---

# authority-conflict

**Инвариант:** sheet INV-01 (ровно один владелец на класс фактов).
**Метрика:** `glt_authority_violations_total` = 0.

Два авторитетных для одного класса фактов источника расходятся, либо у класса оказалось два владельца.

## Detect

- `glt lint authority` даёт exit code 6.
- Узел получил `conflict: source_conflict`.
- Impact-отчёт содержит `coverage_not_established: true` и `known_unknowns` с `kind: source_conflict`.
- Нормативный документ объявляет `owner`, отсутствующий в authority map, или путь, заявленный двумя классами.

## Mitigate

1. **Определить класс фактов**, а не документ. Конфликт всегда о классе: `intended-topology`, `materialized-build`, `observed-runtime` и так далее.
2. **Применить правило разрешения** из [`../../trust/authority-map.yaml`](../../trust/authority-map.yaml):
   - один класс, два источника → `conflicted`, действия выше `read` блокируются;
   - разные классы → оба сохраняются с разделением по планам, это не конфликт;
   - registry против engineering → engineering выигрывает по тексту контракта, registry выигрывает по id и alias;
   - materialized-build против декларации registry → materialized выигрывает.
3. **Не «выбрать правильный» вручную на дашборде.** Ручная отметка статуса создаёт второй источник истины и является запрещённым act.
4. Если у класса действительно два владельца, это дефект authority map: либо класс делится на два, либо один из путей переносится в `excludes`. Правка идёт отдельным PR.

## Escalate

Действия выше `read` остаются заблокированными, пока конфликт не разрешён: impact считается неполным, и решение о безопасности изменения принимать не на чем.

Разрешение конфликта класса фактов — решение владельца класса, не исполнителя, упёршегося в блокировку. См. протокол расширения графа в [`parallel-work.md`](../../00-governance/parallel-work.md).

## Postmortem

- Какой класс фактов и какие два источника.
- Появился ли конфликт из-за деления работы: два исполнителя на одном контексте — известный антипаттерн.
- Нужно ли делить класс, или достаточно уточнить `authoritative_paths`.
- Ловится ли этот случай `glt lint authority`; если нет — какого правила не хватало.
