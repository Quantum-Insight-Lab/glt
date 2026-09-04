# GLT — Glyph Language for Topology

*English · [Русский](README.ru.md)*

A control plane over your existing sources of truth: observable architecture, change impact analysis, and controlled checks.

**Status: pre-code.** There is no code. This repository holds contracts, and they are machine-verified.

---

## What this is

In a system of any real complexity, knowledge about it is spread across product rules, architectural decisions, code, schemas, tests, CI, environment configuration, telemetry, and people's memory. A dashboard answers "which numbers look bad right now". A service catalog answers "what do we have". CI answers "which checks failed".

None of them answers all five questions at once: what changed, which contract stands behind it, which parts of the system are actually affected, what must be re-verified, and which action is permitted right now.

GLT connects those answers through one typed graph: `registry → graph → observed state → impact analysis → safe action → trace`. It is not a new source of truth — it stores a reference and a projection, never a copy of a fact stripped of its provenance.

## Principles you can see in the contracts

- **Unknown is a state, not a shade of green.** Absence of a signal never means healthy.
- **Every edge has a type and evidence.** A list of symbols in order is not yet a dependency graph.
- **Intended, materialized and observed never blend.** The divergence between them is the useful signal.
- **Incompleteness must be named.** An impact report lists its `known_unknowns` instead of implying full coverage.
- **A side effect requires policy, a dry run and a trace.** An arbitrary shell is not an API.
- **An invariant without an enforcing mechanism is a wish.** Which is why the checks live in CI, not in review.

## What GLT does not do

It does not replace git, CI, OpenTelemetry or a service catalog. It does not decide whether your architecture is right. It does not generate code. It does not run `commit`, `push` or `deploy` — in v1 those do not exist as commands, and a test enforces that. And it does not turn the unknown into the known: it shows where a decision came from, whether it was verified, and where the gap is.

**Usefulness is unmeasured.** We cannot yet claim that GLT makes anyone faster: that experiment needs participants who did not author the graph. Correctness of the computation is machine-verifiable; speed of work is not. The distinction between those two claims is written down as two separate gates — see [Correctness gate and Usefulness gate](glt-specpack/docs/EXPERIMENTS/product-gate.md).

---

## Layout

| Path | Contents |
|---|---|
| [`glt-specpack/`](glt-specpack/) | Normative contracts: SPEC, JSON Schema, registries, invariants, 35 development steps |
| [`AGENTS.md`](AGENTS.md) | Executor contract: layer map, mechanism registry, prohibitions, Definition of Done |
| [`archive/`](archive/) | The original GLT 2.0 concept and the PDA methodology. Informative, not normative |

Documentation language is mixed: `docs/SPEC/` and `docs/DEV/` are in English, governance and methodology documents are in Russian.

## Where to start

1. [`glt-specpack/README.md`](glt-specpack/README.md) — what is inside the pack
2. [`docs/SPEC/SPEC.md`](glt-specpack/docs/SPEC/SPEC.md) — the engineering specification
3. [`docs/SPEC/invariants.md`](glt-specpack/docs/SPEC/invariants.md) — 18 protocol rules, and which of them still lack a mechanism
4. [`docs/00-governance/validation-report.md`](glt-specpack/docs/00-governance/validation-report.md) — what is already machine-verified, and which gaps are known rather than forgotten
5. [`docs/DEV/README.md`](glt-specpack/docs/DEV/README.md) — the development plan, four waves

You do not need to read all of it. Wave 1 needs 13 documents out of roughly 120, and each DEV step names exactly the ones it depends on in its `spec_refs`.

## Methodology

[Possibility-Driven Architecture](archive/Possibility-Driven_Architecture_Methodology_ru_v1_1.docx.md) v1.1, plus [patch v1.2](archive/PDA_patch_v1.2_structural_integrity.md) on structural invariants.

---

## License

Not chosen yet. Until a `LICENSE` file exists, all rights remain with the authors by default — keep that in mind if you plan to reuse anything here.
