/**
 * Impact engine — DEV-10.
 *
 * Traversal rules are data, not code: they come from the versioned propagation
 * matrix. A relation with no row in the matrix produces a `known_unknowns`
 * entry of kind `uncovered_relation` — it is never silently skipped, because a
 * missing edge cannot be discovered from the graph itself.
 *
 * Recall of required checks is what the Correctness gate measures, so an
 * omission here is the failure the whole system exists to prevent.
 *
 * Contract: glt-specpack/docs/SPEC/impact.md
 */
export const STEP = "glt.dev.10" as const;
