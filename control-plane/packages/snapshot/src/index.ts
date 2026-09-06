/**
 * SourceRef resolver — DEV-07 — and snapshot compiler — DEV-08.
 *
 * `path` in a SourceRef resolves against the root of the repository named in
 * `repository`, never against the pack root. The snapshot carries full Node and
 * Edge objects with every default materialized (PROTO-04, PROTO-05) and is
 * pinned to a git SHA, artifact digest or deployment id (PROTO-10).
 *
 * The digest comes from the canonicalizer only. A second way to compute it
 * would give PROTO-03 two answers.
 *
 * Contract: glt-specpack/docs/SPEC/snapshots.md
 */
export const STEP = "glt.dev.08" as const;
