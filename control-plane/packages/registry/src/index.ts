/**
 * Registry compiler — DEV-06.
 *
 * Loads the bundle, validates it, resolves aliases and enforces PROTO-01
 * (one alias resolves to at most one semantic id), PROTO-02 (unknown or
 * ambiguous alias errors instead of guessing), PROTO-08 (no alias reassignment
 * within a compatible registry version) and PROTO-09 (semantic change bumps
 * the revision).
 *
 * Contract: glt-specpack/docs/SPEC/registry.md
 */
export const STEP = "glt.dev.06" as const;
