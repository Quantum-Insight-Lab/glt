/**
 * External witness (DEV-28). Pure: endpoint, hashes, ages and the
 * receipt arrive already parsed. HTTP and save live in packages/audit.
 *
 * Stale vs current is snapshotIsStale (S-4). A local chain verify is
 * not a receipt (INV-09). example.invalid is not an endpoint.
 *
 * Contract: glt-specpack/docs/SECURITY/external-witness.md
 */

import { writeBlocked } from "./degrade.ts";
import { isDigest } from "./digest.ts";
import { contractInvalid, invariantViolated } from "./errors.ts";
import { snapshotIsStale } from "./freshness.ts";
import { RUNTIME_IDENTITY } from "./policy.ts";

export const WITNESS_STEP = "glt.dev.28" as const;
export const PLACEHOLDER_WITNESS_HOST = "example.invalid" as const;

export interface WitnessReceiptView {
  readonly receipt_id: string;
  readonly signature: string;
  readonly witness_id: string;
  readonly head_hash: string;
}

export interface WitnessFreshnessInput {
  readonly ageSeconds: number;
  readonly maxStalenessSeconds: number;
  readonly receipt?: WitnessReceiptView;
  /** Local INV-07 result. Never upgrades a missing receipt. */
  readonly localChainOk?: boolean;
}

export interface WitnessAssessment {
  readonly anchored: boolean;
  readonly stale: boolean;
  readonly write_blocked: boolean;
  readonly actions_above: "read";
}

export function requireWitnessEndpoint(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    throw contractInvalid("witness endpoint is empty", ["WITNESS_ENDPOINT"]);
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw contractInvalid("witness endpoint is not a URL", [trimmed]);
  }
  if (parsed.protocol !== "https:") {
    throw contractInvalid("witness endpoint must be https", [trimmed]);
  }
  const host = parsed.hostname.toLowerCase();
  if (host === PLACEHOLDER_WITNESS_HOST || host.endsWith(`.${PLACEHOLDER_WITNESS_HOST}`)) {
    throw contractInvalid("witness endpoint is the example.invalid placeholder", [trimmed]);
  }
  return trimmed;
}

export function receiptIsExternal(receipt: {
  readonly signature: string;
  readonly witness_id: string;
}): boolean {
  const signature = receipt.signature.trim();
  const witnessId = receipt.witness_id.trim();
  if (signature.length === 0 || witnessId.length === 0) return false;
  if (witnessId === RUNTIME_IDENTITY) return false;
  if (witnessId.endsWith("@internal")) return false;
  return true;
}

export function acceptWitnessReceipt(
  receipt: WitnessReceiptView,
  headHash: string,
): WitnessReceiptView {
  if (!isDigest(headHash)) {
    throw contractInvalid("head_hash is not a digest", [headHash]);
  }
  const id = receipt.receipt_id.trim();
  const signature = receipt.signature.trim();
  const witnessId = receipt.witness_id.trim();
  const hash = receipt.head_hash.trim();
  if (id.length === 0) throw contractInvalid("receipt_id is required");
  if (hash !== headHash) {
    throw contractInvalid("receipt head_hash does not match the chain head", [hash, headHash]);
  }
  if (!receiptIsExternal({ signature, witness_id: witnessId })) {
    throw invariantViolated("INV-09", "self-report is not an external witness", [
      witnessId.length > 0 ? witnessId : RUNTIME_IDENTITY,
    ]);
  }
  return {
    receipt_id: id,
    signature,
    witness_id: witnessId,
    head_hash: hash,
  };
}

export function assessWitnessFreshness(input: WitnessFreshnessInput): WitnessAssessment {
  if (!Number.isFinite(input.ageSeconds) || !Number.isFinite(input.maxStalenessSeconds)) {
    throw contractInvalid("witness age and P06 must be finite seconds", ["ageSeconds"]);
  }
  const external = input.receipt !== undefined && receiptIsExternal(input.receipt);
  const ageStale = snapshotIsStale(input.ageSeconds, input.maxStalenessSeconds);
  const stale = !external || ageStale;
  return {
    anchored: external && !ageStale,
    stale,
    write_blocked: writeBlocked(stale, false),
    actions_above: "read",
  };
}
