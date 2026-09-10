/**
 * Collectors — git (DEV-13) and CI attestations (DEV-14).
 *
 * Facts only. No policy. v1 never writes the workspace.
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
export {
  CI_COLLECTOR_ID,
  CI_COLLECTOR_VERSION,
  CI_STEP,
  ciCollectorFreshnessTtl,
  ciFactsExit,
  collectCiFacts,
  collectCiFromPath,
  renderCiCollectorReport,
  runCiCollector,
} from "./ci.ts";
export type {
  CiAttestationFact,
  CiCheckFact,
  CiCollectorReport,
  CiCoverage,
  CiFreshness,
  CiUnknown,
  CollectCiFactsInput,
} from "./ci.ts";
