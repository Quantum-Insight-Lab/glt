---
id: glt.doc.product.value-economics
owner: product
normativity: informative
status: accepted
depends_on:
  - glt.doc.product.overview
source_refs: []
---

# Value и economics

Гипотезы для калибровки после wave 1–2. Не gate criteria до pilot n≥20.

---

## Гипотезы ценности

| ID | Гипотеза | Метрика | Baseline |
|---|---|---|---|
| H1 | Impact быстрее ручного grep+docs | Time to affected set | B1 |
| H2 | Меньше пропущенных checks | Check recall on seeded changes | B0 |
| H3 | Меньше false «all clear» | Unknown visibility rate | B1 |
| H4 | Glyph layer не ухудшает B1 | Task success B1 vs G | A/B |
| H5 | Self-observation ловит spec drift | Drift detection latency | — |
| H6 | Extended alphabet не нужен в MVP | — | holdout |

---

## Anti-metrics (не оптимизировать)

- LOC / glyph
- Число узлов в registry
- «Coverage 100%» без boundary manifest
- Dashboard uptime без task success

---

## Cost model (order of magnitude)

| Статья | MVP | Full |
|---|---|---|
| Registry maintenance | 2–4 h/week | 4–8 h/week |
| Collectors | 0 (static) | 1–2 FTE-week setup |
| Witness infra | 0 | ~$50–200/mo |
| Runner sandbox | 0 | CI minutes + VM |

---

## Decision points

- **After wave 1:** Correctness gate — machine-measured recall and holdout honesty
- **After wave 2:** continue on evidence coverage; Usefulness gate only if ≥4 naive participants are available
- **After wave 4:** Safety gate + sealed holdout

Usefulness остаётся непроверенной, пока эксперимент не проведён. Экономические
оценки ниже — это оценки затрат, а не подтверждённая выгода.
