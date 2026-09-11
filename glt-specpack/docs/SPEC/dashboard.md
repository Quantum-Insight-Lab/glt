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

The Change surface is a **projection**. `projectChangeSurface` clips the
topology to `dashboard.max_top_level_nodes` (P03). It does not compile, does
not write the workspace, and does not accept a status edit.

| Rule | Mechanism |
|---|---|
| Read-only (S-5) | no status control; no `fetch`/workspace write; action requests wait for the API (DEV-21) |
| `unknown` ≠ `healthy` | distinct `data-runtime` and a visible text label, not color alone |
| Color is not the only channel | every axis value is written as text |
| Keyboard and screen reader | `main`, radiogroup for the plane, list of nodes, evidence `region` |
| Glyph layer off | `glyph_layer: blocked` until E04; no glyph rendering |
| Green has a basis | each non-unknown axis shows provenance (`на основании: …`) |

Plane toggle filters `comparePlanes` rows. It does not rewrite a plane
assertion. Combined shows `aligned`, `expected` and `plane_drift` as classes,
not as breakage.

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
