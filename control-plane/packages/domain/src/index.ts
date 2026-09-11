export { canonicalize } from "./canonical.ts";
export { digestOf, digestOfUtf8, isUnfrozenPlaceholder } from "./digest.ts";
export {
  reconcileCoverage,
  parseRegistryIds,
  parseTestIds,
  parseDeferrals,
  type CoverageInput,
  type CoverageReport,
  type Deferral,
} from "./coverage.ts";
export {
  COVERAGE_STEP,
  OUTSIDE_BOUNDARY_POLICY,
  completeImpactAllowed,
  coverageManifestFromDoc,
  coverageNotEstablished,
  reconcileCoverageManifest,
  rejectCompleteImpact,
  type CoverageHonestyInput,
  type CoverageManifest,
  type CoverageRegistryIds,
} from "./coverage-manifest.ts";
export {
  parseMechanismRegistry,
  listedPaths,
  extraSha256HashCalls,
  type MechanismRow,
} from "./mechanisms.ts";
export {
  parameterSpecFromCard,
  parameterValue,
  type ParameterSpec,
} from "./params.ts";
export {
  BOOTSTRAP_FAILURE,
  stripSignature,
  verifyBootstrapManifest,
  type BootstrapVerifyOk,
  type SeedKey,
} from "./bootstrap.ts";
export { keyPairFromUtf8Seed, publicKeyDer, signBytes } from "./signature.ts";
export {
  findCycles,
  findDanglingDependencies,
  findDuplicateIds,
  type GraphNode,
} from "./graph.ts";
export {
  ExitCode,
  GltError,
  contractInvalid,
  evidenceInsufficient,
  invariantViolated,
  sourceConflict,
  usageError,
  type GltErrorInit,
  type InvariantId,
} from "./errors.ts";
export {
  compileRegistry,
  resolveAlias,
  type AliasBinding,
  type CompileRegistryInput,
  type CompiledRegistry,
  type RegistryEdgeView,
  type RegistryEntryView,
} from "./resolve.ts";
export {
  enforceAuthorityMap,
  factClassesFromMap,
  ownersFromClasses,
  type AuthorityFinding,
  type AuthorityReport,
  type FactClass,
  type NormativeDocOwner,
} from "./authority.ts";
export {
  applyJsonPointer,
  applyLineRange,
  applySelector,
  assertDigestMatch,
  classifyResolveInput,
  parseSelector,
  requireEvidencePins,
  uniqueLocator,
  usableAs,
  type LocatorMatch,
  type ResolveInput,
  type ResolvedRef,
  type Selector,
  type SourceRefView,
  type UsableAs,
} from "./sourceref.ts";
export {
  compileSnapshot,
  materializeEdge,
  materializeNode,
  type CompiledSnapshot,
  type SnapshotAssertion,
  type SnapshotCompileInput,
  type SnapshotEdgeDraft,
  type SnapshotNodeDraft,
  type SnapshotPin,
} from "./snapshot.ts";
export {
  CLASSIFIER_VERSION,
  classifyChange,
  computeImpact,
  type ComputeImpactInput,
  type ImpactEdgeView,
  type ImpactMatrixView,
  type ImpactNodeView,
  type ImpactReportView,
  type ImpactRuleView,
  type ImpactSource,
  type ImpactUnknown,
} from "./impact.ts";
export {
  INTENDED_BOUNDARY_ID,
  INTENDED_BOUNDARY_REF,
  assembleIntendedGraph,
  isDevStepId,
  isIntendedBoundaryRef,
  type IntendedComponentStub,
  type IntendedGraph,
  type IntendedSourceRef,
  type IntendedStepCard,
} from "./intended.ts";
export {
  PLANES_STEP,
  comparePlanes,
  planeNodesFromGitModules,
  planeNodesFromRegistryEntries,
  type PlaneComparison,
  type PlaneDelta,
  type PlaneDeltaClass,
  type PlaneName,
  type PlaneNode,
  type PlanePresence,
} from "./planes.ts";
export {
  aggregateScores,
  recallIsComplete,
  recallPrecision,
  type RecallPrecision,
} from "./recall.ts";
export { snapshotIsStale } from "./freshness.ts";
export {
  DEGRADE_STEP,
  actionPermitted,
  assessDegradation,
  currentSignal,
  detectFactConflict,
  writeBlocked,
  type ActionKind,
  type AgedSignal,
  type DegradationAssessment,
  type DegradationInput,
  type FactClaim,
  type FactConflict,
} from "./degrade.ts";
export {
  STATE_STEP,
  asObservation,
  axisKeys,
  bindAxis,
  evaluateNode,
  evaluateState,
  healthExit,
  type AxisValue,
  type ChangeState,
  type ConflictState,
  type CoverageState,
  type DeliveryState,
  type EvaluateStateInput,
  type FreshnessState,
  type NodeAxes,
  type NodeState,
  type NodeStateDraft,
  type ProvenanceClass,
  type RuntimeState,
  type StateUnknown,
  type TopologyState,
  type VerificationState,
} from "./state.ts";
export {
  GATE_STEP,
  evaluateGate,
  gatedChecks,
  gatedChecksFromSnapshot,
  gateEvaluationExit,
  type CheckSignal,
  type CheckState,
  type EvaluateGateInput,
  type GateEdgeView,
  type GateEvaluation,
  type GateEvidence,
  type GateState,
  type GateUnknown,
} from "./gate.ts";
export {
  hashAuditRecord,
  verifyAuditChain,
  type AuditChainLink,
  type AuditChainResult,
} from "./audit-chain.ts";
