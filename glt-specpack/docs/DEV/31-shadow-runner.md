---
id: glt.dev.31
owner: engineering
normativity: normative
status: accepted
wave: 4
depends_on:
  - glt.dev.30
spec_refs:
  - ../SPEC/runner.md
  - ../SPEC/audit.md
  - ../SPEC/architecture.md
  - ../SPEC/events.md
  - ../SPEC/cli.md
  - ../SPEC/structural-invariants.md
  - ../PDA/04-invariants.md
risk: medium
gate: none
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/runner.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/audit.md
    authority: audit-chain
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/architecture.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/events.md
    authority: event-registry
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/cli.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/structural-invariants.md
    authority: structural-invariants
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/PDA/04-invariants.md
    authority: methodology-pda
    role: derived-from
---

# 31 — Shadow runner

**Волна:** 4 · **Риск:** средний · **Gate:** нет

## Что делаем

- Только dry-run, без побочных эффектов

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] Ни один прогон не производит внешнего эффекта — проверено, а не заявлено
- [x] Dry-run обязателен перед любым write-действием
- [x] Результат dry-run попадает в audit

### Общее

- [x] CI зелёный на всех шагах, от которых зависит этот
- [x] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [x] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [x] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

## Спецификация

- [runner.md](../SPEC/runner.md)

`shadowRun` — чистый dry-run: `effects` пуст, иначе INV-06.
`requireDryRunBeforeWrite` не пускает write/external без отчёта
`state: dry_run` на тот же envelope. `shadowAuditRecord` печатает
результат в форму AuditRecord (`hashAuditRecord`, S-4). Событие
`glt.action.started` уже в реестре. Исполнение с эффектом — DEV-32.
`registry/` и схемы не правятся. Команды `glt` не добавляются.

## Статус

**сделано** — ветка `wave4`. Dry-run без внешнего эффекта; write без dry-run того же envelope отвергается; результат в audit. CI: [run](https://github.com/Quantum-Insight-Lab/glt/actions/runs/35060875642).
