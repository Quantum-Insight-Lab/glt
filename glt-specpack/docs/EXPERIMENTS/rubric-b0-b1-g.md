---
id: glt.doc.experiments.rubric
owner: product-research
normativity: normative
status: accepted
depends_on:
  - glt.doc.pda.experiments
source_refs: []
---

# B0 / B1 / G rubric

Рубрика описывает **человеческий** эксперимент. Она относится к Usefulness gate, который отложен со статусом «не проверено» — см. [`product-gate.md`](product-gate.md).

Машинно измеряемые критерии (E02a, E02b, E03, E05a) рубрику не используют: у них нет baseline, есть авторизованная ground truth.

## Baselines

| ID | Setup | Tools |
|---|---|---|
| B0 | README + SPEC grep + память | git, editor |
| B1 | B0 + structured DEV index | markdown DEV/README |
| G | B1 + GLT CLI + snapshot | `glt impact`, `glt verify`, dashboard |

## Task protocol

1. Случайное назначение seeded change (holdout закрыт)
2. Участник находит затронутые узлы и обязательные проверки
3. Записываются время, корректность, false-green
4. n≥12 на ячейку (exploratory)

## Предусловия проведения

Без них рубрика неприменима, а не «применима с оговорками»:

- **≥4 участника, не участвовавших в авторстве графа.** Автор знает ответы наизусть — его время измеряет память.
- **Между условиями нет обучения.** Один человек не может пройти B0, B1 и G: проходя B0, он узнаёт ответы для G. Дизайн межсубъектный, не внутрисубъектный.
- Граф достаточного размера, чтобы правильный ответ не был виден глазами.

## Metrics

- **Primary:** время до правильного набора затронутых узлов
- **Secondary:** recall проверок, число false-green
- **UX:** task success rate, SUS опционально

## Reporting

Медиана, IQR, 95% CI. ROI-утверждений при n<20 нет.

## Freeze

Рубрика заморожена на DEV-03, до работы над UI. Изменение — новая версия рубрики с записью в CHANGELOG.
