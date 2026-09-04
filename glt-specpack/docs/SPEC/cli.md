---
id: glt.doc.spec.cli
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.index
  - glt.doc.spec.runner
source_refs: []
---

# CLI surface

The `glt` binary is the wave 1 interface. It is the only entry point before the API exists (DEV-21), and it stays the reference client afterwards.

Pretty-printed text output is a non-normative projection. The **JSON output is the contract**: it must validate against the schema of the artifact it carries.

---

## Commands

| Command | Capability | Step | Purpose |
|---|---|---|---|
| `glt verify` | validate | DEV-02 | Bootstrap trust: T0 keys, manifest signature, schemas, golden fixtures, invariant suite |
| `glt validate [path...]` | validate | DEV-04 | Schema-validate registry, boundary, matrix and fixtures |
| `glt lint docs` | validate | DEV-03 | Frontmatter contract and `depends_on` DAG acyclicity |
| `glt lint authority` | validate | DEV-05 | Authority map enforcement, one owner per fact class |
| `glt compile registry` | compile | DEV-06 | Resolve aliases, emit compiled registry |
| `glt compile snapshot` | compile | DEV-08 | Emit an immutable topology snapshot |
| `glt resolve <ref>` | inventory | DEV-07 | Resolve an alias, node id or SourceRef |
| `glt inventory` | inventory | DEV-06 | List entries, nodes and edges |
| `glt impact` | inventory | DEV-10 | Change impact or incident propagation report |
| `glt health` | health | DEV-16 | Control plane self health and snapshot freshness |
| `glt typecheck` | typecheck | wave 4 | Delegated build action, through the runner |
| `glt test` | test | wave 4 | Delegated build action, through the runner |

v1 exposes exactly the allowed capabilities: `inventory`, `validate`, `compile`, `typecheck`, `test`, `health`.

**No command in v1 writes to the workspace.** `commit`, `push`, `deploy` and `self-upgrade` are not commands and must not appear as flags, aliases or hidden subcommands. Adding one is a contract violation, not a feature.

---

## Global flags

| Flag | Default | Meaning |
|---|---|---|
| `--registry <path>` | `registry/glt-controlplane.yaml` | Registry bundle |
| `--boundary <id>` | bundle `metadata.boundary` | Coverage boundary |
| `--matrix <path>` | `contracts/propagation/propagation-matrix.yaml` | Propagation matrix |
| `--snapshot <path\|id>` | latest in `snapshots/` | Snapshot to read |
| `--as-of <rfc3339>` | now, truncated to the second | Pinned snapshot time |
| `--max-depth <n>` | `impact.max_traversal_depth` (8) | Traversal limit |
| `--output <json\|text>`, `-o` | `text` on a TTY, `json` otherwise | Output format |
| `--no-color` | off | Disable ANSI styling |
| `--quiet`, `-q` | off | Suppress progress on stderr |
| `--verbose`, `-v` | off | Diagnostic detail on stderr |

`--as-of` is truncated to whole seconds so that two runs in the same second are byte-identical.

---

## Streams

- **stdout** carries the artifact and nothing else. With `-o json` it is exactly one JSON document.
- **stderr** carries progress, warnings and diagnostics.
- Piping stdout into another tool never requires filtering.

A command that has no artifact to emit writes nothing to stdout and reports through its exit code.

---

## Exit codes

| Code | Meaning |
|---:|---|
| 0 | Success |
| 1 | Usage or configuration error |
| 2 | Contract validation failure (schema invalid) |
| 3 | Invariant violation |
| 4 | Policy denied or gate blocked |
| 5 | Evidence insufficient: stale, unknown, or coverage not established |
| 6 | Source conflict between two authoritative sources of one fact class |
| 70 | Internal error |

Codes are stable and machine-checkable: CI distinguishes «the graph says no» (4, 5, 6) from «the tool is broken» (1, 70). Codes 2 and 3 are distinct because a schema-valid artifact can still violate a protocol invariant.

Exit code 0 requires a positive result. Absence of a signal is never success — it is code 5.

---

## Determinism

For a fixed input set, `-o json` output must be byte-identical across runs and machines:

- no wall-clock timestamps beyond the pinned `as_of`;
- no durations, hostnames, usernames or absolute paths;
- no iteration order that depends on a hash map;
- canonical form per [snapshots.md](snapshots.md).

Anything genuinely non-reproducible belongs on stderr.

---

## Errors

Machine-readable errors go to stderr as one JSON object per line when `-o json`:

```json
{
  "code": 3,
  "invariant": "PROTO-03",
  "message": "snapshot digest mismatch",
  "refs": ["snap-bootstrap-golden-001"]
}
```

An error never claims more certainty than the graph supports: an unresolvable alias reports «unknown», not a guess.
