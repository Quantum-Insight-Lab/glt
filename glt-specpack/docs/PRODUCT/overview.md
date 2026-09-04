---
id: glt.doc.product.overview
owner: product
normativity: normative
status: accepted
depends_on:
  - glt.doc.governance.metadata-contract
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "sections:0-2"
    authority: engineering-contract
    role: informative
---

# PRODUCT — обзор

GLT (Glyph Language for Topology) — **Control Plane** для разработчика и архитектора: наблюдаемая архитектура, анализ влияния изменений, контролируемые read/build-действия.

---

## Персона

**Primary:** Developer / Tech Lead, 5–50 человек в команде, polyglot monorepo или несколько сервисов.

**Secondary:** Architect — drift между intended и materialized; blast radius.

**Tertiary:** Operator — incident propagation, не россыпь метрик.

---

## Jobs-to-be-done

1. «Что затронет мой PR?» — impact за <2 мин.
2. «Где расходится документация и код?» — три плоскости на одном экране.
3. «Какие проверки обязательны?» — gate из графа, не из памяти.
4. «Что сломалось и куда течёт?» — candidate paths, не causal claims без evidence.
5. «Можно ли безопасно запустить проверку?» — sandboxed runner, audit trace.

---

## Scope v1

- Registry + topology snapshot (intended, build partial)
- Bootstrap slice: RegistryEntry → Compiler → Check → Gate
- Static verifier + CLI impact report
- B1 dashboard (Change mode, developer persona)
- Self-observation GLT development (read-only)
- Controlled read/build runner (no write/deploy)

---

## Non-goals v1

- Code generation as primary value
- LLM as compiler/validator
- Self-write, commit, push, deploy
- Full runtime overlay (wave 3)
- Multi-tenant SaaS
- Replacing existing SoT (git, SPEC, telemetry)

---

## Value chain

```text
registry → graph → observed state → impact → safe action → trace
```

---

## Definition of Useful

### Useful MVP (wave 1–2)

Developer на реальном slice находит affected nodes и required checks **быстрее B1 baseline** (см. experiments), без ложного «всё зелёное» при `unknown`.

### Useful full Control Plane (wave 3–4)

Self-hosted runtime наблюдает собственную разработку; external witness подтверждает audit head; runner выполняет allowlisted read/build с tamper-evident trace.

---

## Economics (hypothesis)

- Экономия: время локализации изменения/инцидента, снижение пропущенных checks.
- Стоимость: поддержка registry, collectors, infra witness.
- Anti-ROI: «красивый dashboard» без измеримого TTL impact.

См. [`value-economics.md`](value-economics.md).
