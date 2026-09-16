/**
 * Sealed acceptance (DEV-35). Pure: the DEV-34 release input, parsed
 * trust roots and artifact digests arrive already parsed. No I/O, no
 * Cosign, no trust/ write (S-1).
 *
 * Calls admitRelease (S-4), then fails closed on an empty or forbidden
 * T0 root (INV-10) and leftover placeholders (PROTO-10). The published
 * dev-only key is never a release root.
 *
 * Contract: glt-specpack/docs/EXPERIMENTS/safety-gate.md
 */

import { isDigest, isUnfrozenPlaceholder } from "./digest.ts";
import { contractInvalid, invariantViolated, policyDenied } from "./errors.ts";
import {
  admitRelease,
  type AdmitReleaseInput,
  type ReleaseAdmission,
} from "./release.ts";
import { requireWitnessEndpoint } from "./witness.ts";

export const SEAL_STEP = "glt.dev.35" as const;

/** Published seed. Usable in CI, never as a sealed T0 root. */
export const DEV_ONLY_KEY_ID = "glt-dev-only-2026" as const;

export interface TrustRootsView {
  readonly allowed: readonly string[];
  readonly forbidden: readonly string[];
  readonly terminating_key_id: string;
}

export interface SealArtifacts {
  readonly verifier_binary_digest: string;
  readonly witness_endpoint: string;
  readonly golden_digests: readonly string[];
}

export interface AdmitSealedReleaseInput {
  readonly release: AdmitReleaseInput;
  readonly roots: TrustRootsView;
  readonly artifacts: SealArtifacts;
}

export interface SealedAdmission extends ReleaseAdmission {
  readonly sealed: true;
  readonly terminating_key_id: string;
}

export function admitTrustRoots(roots: TrustRootsView): string {
  const key = asNonEmpty(roots.terminating_key_id, "terminating_key_id");
  const allowed = roots.allowed.map((id) => id.trim()).filter((id) => id.length > 0);
  const forbidden = roots.forbidden.map((id) => id.trim()).filter((id) => id.length > 0);
  if (allowed.length < 1) {
    throw policyDenied("sealed release requires a non-empty trust root allow-list", ["allowed"], "INV-10");
  }
  if (key === DEV_ONLY_KEY_ID || forbidden.includes(key)) {
    throw policyDenied("dev-only or forbidden key cannot terminate a sealed release", [key], "INV-10");
  }
  if (!allowed.includes(key)) {
    throw policyDenied("terminating key is not an allowed trust root", [key], "INV-10");
  }
  return key;
}

export function rejectReleasePlaceholders(artifacts: SealArtifacts): void {
  requireReleaseDigest(artifacts.verifier_binary_digest, "verifier.binary_digest");
  requireWitnessEndpoint(artifacts.witness_endpoint);
  if (artifacts.golden_digests.length < 1) {
    throw contractInvalid("sealed release has no golden digest");
  }
  for (const digest of artifacts.golden_digests) {
    requireReleaseDigest(digest, "golden_fixture_digests");
  }
}

export function admitSealedRelease(input: AdmitSealedReleaseInput): SealedAdmission {
  const admitted = admitRelease(input.release);
  const terminating = admitTrustRoots(input.roots);
  rejectReleasePlaceholders(input.artifacts);
  return { ...admitted, sealed: true, terminating_key_id: terminating };
}

function requireReleaseDigest(value: string, field: string): string {
  const trimmed = asNonEmpty(value, field);
  if (trimmed.includes("placeholder") || !isDigest(trimmed) || isUnfrozenPlaceholder(trimmed)) {
    throw invariantViolated("PROTO-10", "sealed release still carries a placeholder digest", [field]);
  }
  return trimmed;
}

function asNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw contractInvalid(`${field} is required`);
  return trimmed;
}
