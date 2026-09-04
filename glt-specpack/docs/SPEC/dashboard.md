---
id: glt.doc.spec.dashboard
owner: engineering
normativity: normative
status: accepted
depends_on:
  - glt.doc.spec.topology
source_refs:
  - repository: glt-controlplane
    path: archive/GLT-2.0.md
    selector: "section:7"
    authority: engineering-contract
    role: informative
---

# Dashboard

## Modes

| Mode | Persona | Default |
|---|---|:---:|
| Change | Developer | ✓ MVP |
| Runtime | Operator | wave 3 |
| History | Audit review | wave 3 |

## One-screen (Change mode)

- Center: stable topology, plane toggle `Intended / Build / Combined`
- Right: evidence panel for selected node
- Top: project, env, git SHA, snapshot freshness, conflict count
- Bottom drawer: impact report / check results (on demand)

## Glyph layer (G treatment)

- Identity in glyph; state in contour/fill/badge
- Max 12–20 top-level nodes (param P03)
- `unknown` visually distinct from `healthy`
- Color not sole channel; keyboard accessible

## Non-goals

- Manual status edit on dashboard
- Causal arrows without evidence
- Full data dump on main screen

## Gating

Glyphs ship only after the B1 baseline is measured (E04). That measurement
belongs to the **Usefulness gate**, which is deferred with status *not measured*
until at least four people who did not author the graph are available — see
[`../EXPERIMENTS/product-gate.md`](../EXPERIMENTS/product-gate.md).

So the glyph layer is blocked indefinitely, and that is the intended outcome
rather than an oversight: an unmeasured visual language is exactly the "secret
dictionary" GLT 2.0 rejects. The Change mode works on text labels and node ids
without it.

The Correctness gate (DEV-12) is machine-measured and does not use the
dashboard. Nothing in the dashboard is a prerequisite for it.
