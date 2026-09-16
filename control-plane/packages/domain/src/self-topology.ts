/**
 * Self-topology observation (DEV-27). Pure: registry ids, hashes and
 * detect_seconds arrive already parsed. Compile and git I/O stay outside.
 *
 * Drift class is classifyDeployDrift (S-4). Observation never grants
 * approve (INV-09). detect_seconds is already in seconds (S-8).
 *
 * Contract: glt-specpack/docs/SPEC/self-hosting.md
 */

import { classifyDeployDrift, type DeployBuildPin, type DeployDriftClass } from "./drift.ts";
import { contractInvalid, evidenceInsufficient, invariantViolated } from "./errors.ts";

export const SELF_TOPOLOGY_STEP = "glt.dev.27" as const;
export const SELF_TOPOLOGY_NAMESPACE = "glt.controlplane" as const;

export interface SelfObservationInput {
  readonly namespace: string;
  readonly registryIds: readonly string[];
  readonly pin: DeployBuildPin;
  /** Elapsed seconds from seed to observe. Converted outside domain. */
  readonly detectSeconds: number;
}

export interface SelfObservation {
  readonly namespace: typeof SELF_TOPOLOGY_NAMESPACE;
  readonly registry_ids: readonly string[];
  readonly drift: DeployDriftClass;
  readonly detect_seconds: number;
  readonly grants_approve: false;
}

const ID_PREFIX = `${SELF_TOPOLOGY_NAMESPACE}.`;

export function observeSelfTopology(input: SelfObservationInput): SelfObservation {
  if (input.namespace !== SELF_TOPOLOGY_NAMESPACE) {
    throw contractInvalid("self-topology namespace must be glt.controlplane", [input.namespace]);
  }
  if (input.registryIds.length === 0) {
    throw contractInvalid("self-topology registry is empty");
  }
  for (const id of input.registryIds) {
    if (!id.startsWith(ID_PREFIX)) {
      throw contractInvalid("registry id is outside glt.controlplane.*", [id]);
    }
  }
  if (input.detectSeconds < 0) {
    throw contractInvalid("detect_seconds is negative", ["detect_seconds"]);
  }

  return {
    namespace: SELF_TOPOLOGY_NAMESPACE,
    registry_ids: [...input.registryIds].sort(),
    drift: classifyDeployDrift(input.pin),
    detect_seconds: input.detectSeconds,
    grants_approve: false,
  };
}

/** E05: a seed that is not drift is silence, not a measurement. */
export function requireSeededDriftDetected(observation: SelfObservation): void {
  if (observation.drift !== "drift") {
    throw evidenceInsufficient("seeded drift not detected", [observation.namespace]);
  }
}

/** INV-09: watching own topology is not a release approval. */
export function assertObservationDoesNotApprove(observation: {
  readonly grants_approve: boolean;
}): void {
  if (observation.grants_approve) {
    throw invariantViolated("INV-09", "self-observation granted approve");
  }
}
