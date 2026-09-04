---
id: glt.doc.pda.experiments
owner: product-research
normativity: normative
status: accepted
depends_on:
  - glt.doc.pda.feedback-loops
  - glt.doc.product.overview
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "section:12"
    authority: engineering-contract
    role: informative
---

# PDA Step 8 — Experiments

Frozen до UI/runner: Correctness gate, Usefulness gate и Safety gate. Детали: [`../EXPERIMENTS/`](../EXPERIMENTS/).

---

## Experiment cards (summary)

| ID | Hypothesis | Baseline | Primary metric | Измеряется |
|---|---|---|---|---|
| E01 | Impact faster | B1 manual | Time to affected set | людьми — отложен |
| E02a | Обязательные проверки не теряются | ground truth | Recall = 1.0 | машинно |
| E02b | Затронутые узлы не теряются | ground truth | Recall = 1.0 | машинно |
| E03 | Unknown visible | ground truth | False green = 0 | машинно |
| E04 | Glyphs neutral/helpful | B1 text | Task success, time | людьми — отложен |
| E05 | Self-observation drift | — | Time to detect seeded drift | машинно |
| E05a | Пробелы названы | ground truth | known_unknowns не пуст вне boundary | машинно |
| E06 | Runner sandbox safe | — | Escape attempts blocked | машинно |

Разделение по колонке «измеряется» существенно: критерий, требующий человеческого baseline, нельзя провести при одном исполнителе, и делать вид, что можно, значит превращать gate в формальность.

---

## Baselines

- **B0:** README + SPEC grep + mental checklist
- **B1:** B0 + structured DEV index markdown (no graph)
- **G:** B1 + GLT bootstrap slice tool

---

## Sample size (exploratory v1)

- n≥12 per cell for directional signal (not powered for 20% lift claim)
- Между условиями нет обучения: дизайн межсубъектный, один человек не проходит B0, B1 и G
- Holdout golden cases sealed before DEV-12
- Confidence intervals reported, not point estimates only

Относится только к человеческим критериям E01 и E04. Машинные критерии не имеют
выборки: они либо выполняются на всём наборе, либо нет.

---

## Gates (frozen)

### Correctness gate (after DEV-12, блокирующий)

- E02a: recall обязательных проверок = 1.0 против ground truth
- E02b: recall затронутых узлов = 1.0
- E03: ноль false-green на holdout H01–H05
- E05a: `known_unknowns` не пуст всегда, когда изменение выходит за boundary

Recall гейтится, precision публикуется. Пропуск обязательной проверки и лишний
узел в отчёте — не равнозначные исходы.

### Usefulness gate (отложен, статус «не проверено»)

- E01: median time G ≤ B1 OR ≥20% reduction (exploratory)
- E04: G not worse than B1 on task success (non-inferiority)

Требует ≥4 участников, не писавших граф. Пока статус не изменён: алфавит не
расширяется, утверждения об ускорении работы не делаются.

### Safety gate (after DEV-32)

- E06: 100% block on escape scenarios 1–6
- INV-07–10 verified in staging
- Witness stale scenario handled per runbook

---

## Seeded failures (holdout)

1. Remove validates edge → gate must fail
2. Add file outside boundary → known_unknowns non-empty
3. Conflict two SoT → conflict axis set
4. Stale snapshot → freshness stale, block write
5. Tamper audit → verify fail

List frozen in [`../EXPERIMENTS/holdout-cases.yaml`](../EXPERIMENTS/holdout-cases.yaml).

---

## Anti-patterns

- Claim ROI before n≥20
- Tune parameters on holdout set
- Ship glyph layer before B1 baseline measured
- Считать отсутствие измерения успешным измерением
- Сравнивать G с baseline, полученным от автора графа
- Гейтить precision наравне с recall
