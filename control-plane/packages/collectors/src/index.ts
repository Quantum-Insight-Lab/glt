/**
 * Git collector — DEV-13.
 *
 * Collects materialized facts from a pinned git commit. Does not decide
 * policy and does not write the workspace.
 *
 * Contract: glt-specpack/docs/SPEC/collectors.md
 */
export {
  COLLECTOR_ID,
  COLLECTOR_VERSION,
  MATERIALIZED_PLANE,
  STEP,
  collectGitFacts,
  collectGitFromRepo,
  gitCollectorFreshnessTtl,
  gitFactsExit,
  renderGitCollectorReport,
  reportHasPolicyFields,
  requireMaterializedPlane,
  runGitCollector,
} from "./git.ts";
export type {
  CollectGitFactsInput,
  GitCollectorReport,
  GitCoverage,
  GitTree,
  GitUnknown,
  ModuleEdge,
  ModuleNode,
  OwnershipHint,
} from "./git.ts";
