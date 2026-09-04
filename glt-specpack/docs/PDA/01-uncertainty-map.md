---
id: glt.doc.pda.uncertainty-map
owner: product-architecture
normativity: normative
status: accepted
depends_on:
  - glt.doc.product.overview
  - glt.doc.governance.metadata-contract
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "sections:1,16"
    authority: engineering-contract
    role: informative
---

# PDA Step 1 — Карта неопределённости

22 карты. Ранжирование: `score = error_cost (1–5) × frequency (1–5)`.

---

## A. Неопределённости, которые GLT закрывает

| ID | Вопрос | Error | Freq | Score | Закрывается |
|---|---|:---:|:---:|:---:|---|
| U01 | Какие узлы затронет изменение файла X? | 5 | 5 | 25 | Impact engine + topology |
| U02 | Какой контракт стоит за символом/модулем? | 4 | 5 | 20 | Registry resolve |
| U03 | Документация соответствует коду? | 4 | 4 | 16 | Intended vs materialized |
| U04 | Какие checks обязательны перед merge? | 5 | 4 | 20 | Gate nodes + validates edges |
| U05 | Куда может распространиться отказ узла N? | 5 | 3 | 15 | Incident propagation |
| U06 | Свеж ли снимок topology? | 3 | 5 | 15 | Freshness axis |
| U07 | Есть ли конфликт двух SoT? | 4 | 3 | 12 | conflict: source_conflict |
| U08 | Какое действие разрешено сейчас? | 5 | 3 | 15 | Policy + runner |
| U09 | Был ли plan изменён после approval? | 5 | 2 | 10 | Signed plan envelope |
| U10 | Можно ли воспроизвести решение через 6 мес? | 4 | 2 | 8 | Audit trace + digests |
| U11 | Где пробел в coverage графа? | 3 | 4 | 12 | known_unknowns |
| U12 | Какой blast radius у schema change? | 4 | 3 | 12 | change-impact matrix |
| U13 | Какие collectors нужны дальше? | 2 | 3 | 6 | Coverage projection |
| U14 | LLM-объяснение опирается на факты? | 4 | 3 | 12 | SourceRef in explanations |
| U15 | Self-hosting не circular? | 5 | 2 | 10 | T0 + external witness |

## B. GLT намеренно не закрывает

| ID | Вопрос | Почему |
|---|---|---|
| U16 | Правильна ли продуктовая архитектура? | GLT — control plane, не architect substitute |
| U17 | Нужна ли фича бизнесу? | Вне scope |
| U18 | Истинны ли human-only claims | Нет machine evidence |
| U19 | Здоров ли сервис без сигнала? | unknown, не green |
| U20 | Что написать в коде | Не code generator v1 |

## C. Неопределённость инструмента (meta)

| ID | Чего не знаем | Как узнаём |
|---|---|---|
| U21 | Ускоряет ли GLT реальную работу | B0/B1/G experiments |
| U22 | Glyph vs text-only для навигации | H4 A/B, holdout |
| U23 | Достаточен ли bootstrap slice | Golden cases + boundary |
| U24 | Runner sandbox держит escape | Safety gate + pentest scenarios |
| U25 | Witness stale detection works | Seeded stale witness test |

---

## Top-5 по score

1. **U01** — affected nodes (25)
2. **U02** — contract behind symbol (20)
3. **U04** — required checks (20)
4. **U03** — doc vs code (16)
5. **U05** — incident propagation (15)

---

## Non-goals (явные)

- Замена git, CI, OTel, Backstage
- Автономный deploy
- «Один экран для CEO» в MVP
