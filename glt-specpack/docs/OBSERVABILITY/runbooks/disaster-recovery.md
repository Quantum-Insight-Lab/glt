---
id: glt.doc.observability.runbook.disaster-recovery
owner: reliability
normativity: informative
status: accepted
depends_on:
  - glt.doc.observability.runbooks-index
  - glt.doc.spec.self-hosting
source_refs:
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/self-hosting.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SECURITY/supply-chain.md
    authority: engineering-contract
    role: derived-from
  - repository: glt-controlplane
    path: glt-specpack/docs/SPEC/audit.md
    authority: audit-chain
    role: derived-from
---

# disaster-recovery

**Инвариант:** INV-07 (цепочку не переписывают), INV-10 (T0 вне манифеста),
PROTO-16 (нет эффекта без audit).
**Метрика:** `audit_chain_verify_success`, `bootstrap_verify_pass`.

Восстановление после потери машины, тома postgres или доступа к T0.
Процедура рассчитана на человека, который **не** писал этот документ.
Multi-region replica в v1 нет: одна копия Compose и внешний witness.

## Detect

- Хост с `deploy/compose.yaml` недоступен.
- Том `postgres_data` повреждён или удалён.
- `glt verify` не проходит на чистом клоне.
- `admitSealedRelease` отвергает пустой `allowed` или `glt-dev-only-2026`.

## Mitigate

1. **Не поднимать runner и не писать в копию.** Нет `glt deploy`,
   `glt commit`, `glt push`. Self-host — только
   `docker compose -f deploy/compose.yaml --env-file deploy/.env`.
2. **Поднять стек с pinned-образами.** Скопировать
   `deploy/.env.example` в `deploy/.env`, задать `POSTGRES_PASSWORD`.
   Образы и `FROM` должны быть `name@sha256:` + 64 hex. Тег без digest
   — не восстановление (PROTO-10).
3. **Вернуть том postgres из резервной копии**, не из «починенного»
   SQL. Каталог данных — volume `postgres_data`. После монтирования
   прогнать сверку audit-цепочки. Расхождение `prev_hash` — стоп:
   см. [audit-chain-break.md](audit-chain-break.md). Пересчёт хэшей
   запрещён (INV-07).
4. **Проверить T0 до манифеста.** Ключи из
   `trust/seed-public-keys/`, затем подпись
   `trust/bootstrap-manifest.yaml`. Ключ только из тела манифеста —
   отказ (INV-10). `glt-dev-only-2026` годится для CI, не для печати
   релиза.
5. **Сверить witness.** Если `WITNESS_ENDPOINT` — `example.invalid`
   или пуст, это не якорь. Нужен внешний receipt на head-hash.
   Локальная verify цепочки не заменяет receipt.
6. **Не печатать релиз с placeholder.** Digest верификатора, golden
   и endpoint не могут быть зарезервированным нулём или строкой
   `placeholder`. Пустой `release_trust_roots.allowed` — не печать.
7. **Health только на 127.0.0.1:4174** с `GLT-Actor` и
   `GLT-Role: reader`. Публикация postgres/redis наружу запрещена.

## Escalate

Потеря единственной копии тома без резервной копии и без witness
receipt — потеря доказуемости после последнего якоря. Control plane
не подтверждает сам себя. Нужны внешний approver и, если T0 утрачен,
новый ключ в `allowed` (оператор, не CI).

## Postmortem

- Была ли резервная копия тома старше последнего witness receipt.
- Не пересчитывали ли `prev_hash`.
- Не оказался ли dev-only ключ единственным в `allowed`.
- Смогла ли процедура пройтись без автора этого runbook.
