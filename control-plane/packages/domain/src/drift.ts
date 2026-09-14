/**
 * Drift and incident classifiers (DEV-26). Pure: hashes, plane and
 * trace-parentage arrive already parsed. Traversal stays in impact.ts.
 *
 * Incident paths: materialized is a candidate. Confirmed requires the
 * observed plane and trace-parentage (INV-04).
 * Deploy vs build: mismatch or a missing side is drift, not silence
 * (PROTO-12). The function names the class; it does not pick a winner.
 *
 * Contract: glt-specpack/docs/SPEC/degradation.md
 *           glt-specpack/docs/SPEC/impact.md
 */

export const DRIFT_STEP = "glt.dev.26" as const;

export type IncidentPlane = "intended" | "materialized" | "observed";
export type IncidentPathClass = "candidate" | "confirmed";
export type DeployDriftClass = "aligned" | "drift";

export interface IncidentPathEvidence {
  readonly plane: IncidentPlane;
  readonly traceParentage: boolean;
}

export interface DeployBuildPin {
  readonly buildHash: string;
  readonly deploymentHash: string;
}

/** Materialized (or observed without parentage) is a candidate, not a cause. */
export function classifyIncidentPath(input: IncidentPathEvidence): IncidentPathClass {
  if (input.plane === "observed" && input.traceParentage) return "confirmed";
  return "candidate";
}

/** A missing or unequal hash is drift. Equal present hashes are aligned. */
export function classifyDeployDrift(input: DeployBuildPin): DeployDriftClass {
  const build = input.buildHash.trim();
  const deploy = input.deploymentHash.trim();
  if (build.length === 0 || deploy.length === 0 || build !== deploy) return "drift";
  return "aligned";
}
