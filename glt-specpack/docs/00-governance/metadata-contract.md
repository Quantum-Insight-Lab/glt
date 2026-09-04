---
id: glt.doc.governance.metadata-contract
owner: governance
normativity: normative
status: accepted
depends_on: []
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    authority: engineering-contract
    role: informative
---

# Metadata-контракт документов

Каждый markdown в `docs/` **обязан** начинаться с YAML-frontmatter. Без frontmatter документ не участвует в DAG и не может быть normative.

---

## Обязательные поля

| Поле | Тип | Описание |
|---|---|---|
| `id` | string | Стабильный ID: `glt.doc.<area>.<slug>` |
| `owner` | string | Единственный владелец класса фактов документа |
| `normativity` | enum | `normative` \| `informative` \| `non_normative` |
| `status` | enum | `draft` \| `review` \| `accepted` \| `deprecated` |
| `depends_on` | string[] | ID документов-предшественников (ациклично) |
| `source_refs` | object[] | Происхождение; см. SourceRef |

---

## Опциональные поля

| Поле | Описание |
|---|---|
| `version` | Версия документа (SemVer или date) |
| `supersedes` | ID заменяемого документа |
| `tags` | Произвольные метки для индекса |
| `review_by` | Дата или gate, до которого нужен пересмотр |

---

## SourceRef в frontmatter

```yaml
source_refs:
  - repository: glt-controlplane
    commit: abc123
    path: glt-specpack/docs/SPEC/registry.md
    selector: "lines:10-40"
    digest: "sha256:..."
    authority: engineering-contract
    role: derived-from | supersedes | informative
```

- `path` отсчитывается от **корня репозитория**, названного в `repository`, а не от корня пакета. Это единственное правило, которое resolver (DEV-07) выполняет без догадок. До 0.6.0 в пакете сосуществовали две конвенции — `docs/SPEC/...` и `glt-specpack/docs/...` — и разрешить такую ссылку однозначно было нельзя.
- `authority` обязателен и должен быть id класса фактов из [`trust/authority-map.yaml`](../../trust/authority-map.yaml). Это свойство **источника**, а не ссылающегося документа: `role: informative` при `authority: engineering-contract` читается как «источник принадлежит инженерному классу и цитируется информативно».
- `commit` и `digest` обязательны для **approval** и **gate** evidence.
- Без commit/digest ссылка годится только для навигации.

При выносе пакета в отдельный репозиторий, где `glt-specpack/` становится корнем, префикс `glt-specpack/` из всех `path` удаляется. Забыть об этом нельзя молча: проверка существования `source_refs` падает.

Схема: [`../../contracts/schemas/source-ref.schema.json`](../../contracts/schemas/source-ref.schema.json). Frontmatter `source_refs[]` валидируется ею же — второго определения SourceRef нет.

---

## Правила normativity

**normative** — единственный источник для своего класса фактов. Конфликт с другим normative → `conflicted`, блокировка write/runner.

**informative** — контекст, rationale, история. Не блокирует и не разрешает действия.

**non_normative** — примеры, adopters, черновики. Путь `examples/**` всегда non_normative.

---

## Запреты

1. Generated snapshot/report/dashboard state в `depends_on` normative docs.
2. Циклы в `depends_on`.
3. Два normative документа с одним owner для одного класса фактов.
4. Self-reference: документ не может ссылаться на себя в `depends_on`.
5. Компонент как единственный валидатор собственного artifact (см. invariants).

---

## Пример

```yaml
---
id: glt.doc.spec.registry
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.governance.metadata-contract
  - glt.doc.pda.domain-graph
  - glt.doc.governance.pre-code-gate
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "sections:3,6"
    authority: engineering-contract
    role: informative
---
```

---

## Машинная проверка (DEV-02)

Bootstrap verifier проверяет:

- все `depends_on` разрешаются;
- граф ацикличен;
- каждый `id` уникален;
- `normative` docs имеют `owner` из authority map;
- `examples/**` только `non_normative`.
