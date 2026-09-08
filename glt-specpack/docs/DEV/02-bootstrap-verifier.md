---
id: glt.dev.02
owner: engineering
normativity: normative
status: accepted
wave: 1
depends_on:
  - glt.dev.01
spec_refs:
  - ../SPEC/invariants.md
  - ../SPEC/cli.md
  - ../SPEC/self-hosting.md
  - ../SECURITY/bootstrap-trust.md
  - ../PDA/04-invariants.md
  - ../OBSERVABILITY/runbooks/bootstrap-trust-fail.md
risk: high
gate: trust
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/trust/bootstrap-manifest.yaml
    authority: bootstrap-trust
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/trust/seed-public-keys/glt-dev-only-2026.pub
    authority: bootstrap-trust
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/trust/seed-public-keys/README.md
    authority: bootstrap-trust
    role: informative
---

# 02 — Bootstrap verifier

**Волна:** 1 · **Риск:** высокий · **Gate:** trust

## Что делаем

- CLI `glt verify`

## Чеклист приёмки

Отмечать только то, что проверено. Непроверенный пункт остаётся пустым —
именно из-за преждевременных галочек в 0.1.0 «DAG ацикличен» стоял
пройденным при живом цикле.

### По шагу

- [x] `glt verify` читает T0-ключи из `trust/seed-public-keys/` **до** разбора манифеста, а не после
- [x] Манифест, подписанный только тем ключом, который в нём же и лежит, отвергается (sheet INV-10)
- [x] Прогон на свежей копии репозитория проходит без ручных шагов
- [x] Понятно, какой из трёх отказов произошёл: нет ключа, не сошлась подпись, неверный порядок загрузки

### Общее

- [ ] CI зелёный на всех шагах, от которых зависит этот
- [ ] Тесты на затронутые инварианты есть, и ID инварианта стоит **в имени теста**
- [ ] Изменение контракта записано в `glt-specpack/CHANGELOG.md`
- [ ] Механизм проверен негативно: нарушение внесено намеренно и прогон упал

### Чем проверить

```bash
pnpm verify
```

`pnpm verify` сам вызывает `pnpm gen`: сгенерированные типы в gitignore, и без этого шага свежий клон не стартует. `pnpm glt verify` gen не делает.

Глобальной команды `glt` нет. `pnpm glt` — скрипт в корневом `package.json`.

Три отказа различаются полем `refs[0]` в JSON на stderr: `missing-seed-key`, `bad-signature`, `embedded-key`.

## Спецификация

- [invariants.md](../SPEC/invariants.md)
- [cli.md](../SPEC/cli.md)
- [self-hosting.md](../SPEC/self-hosting.md)
- [bootstrap-trust.md](../SECURITY/bootstrap-trust.md)
- [INV-10 sheet](../PDA/04-invariants.md)
- [bootstrap-trust-fail.md](../OBSERVABILITY/runbooks/bootstrap-trust-fail.md)

## Статус

**сделано** — ветка `wave1`. `glt verify` загружает `trust/seed-public-keys/*.pub` **до** разбора манифеста, затем проверяет Ed25519-подпись. Ключ из тела манифеста не принимается: это sheet INV-10, а не «подпись не сошлась».

Три отказа различимы: нет T0-ключа (`missing-seed-key`, код 5), подпись не сходится (`bad-signature`, код 3), в манифесте лежит ключевой материал (`embedded-key`, код 3).

Схемы и golden digest в этот шаг не входят. `cli.md` называет их целью команды целиком; валидатор схем — DEV-04, заморозка digest — DEV-09. Сверять unfrozen placeholder здесь значило бы ронять свежий клон.

Подпись стоит в `metadata.signature` и снята с канонической формы перед проверкой: JCS (RFC 8785) документа без этого поля. Канонизатор и digest живут в `packages/domain`, без сторонних зависимостей.
