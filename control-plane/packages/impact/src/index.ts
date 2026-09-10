/**
 * Impact engine — DEV-10.
 *
 * Traversal rules are data, not code: they come from the versioned propagation
 * matrix. A relation with no row in the matrix produces a `known_unknowns`
 * entry of kind `uncovered_relation` — it is never silently skipped, because a
 * missing edge cannot be discovered from the graph itself.
 *
 * Contract: glt-specpack/docs/SPEC/impact.md
 */
export {
  computeImpactFromPaths,
  impactGraphFromSnapshot,
  impactMaxTraversalDepth,
  loadPropagationMatrix,
  renderImpactReport,
} from "./compute.ts";
export type { ComputeImpactFromPathsOptions } from "./compute.ts";
export const STEP = "glt.dev.10" as const;
