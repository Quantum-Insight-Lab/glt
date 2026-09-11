/**
 * Freshness and source-conflict degradation (DEV-17). Pure: ages, TTL and
 * claims arrive already parsed. Stale vs current uses `snapshotIsStale`
 * (S-4). The threshold is the caller's parameter value, not a literal (S-8).
 *
 * Stale snapshot: warn; block write/runner; read stays allowed.
 * Same fact class, two digests: `source_conflict`; block everything above
 * read; do not pick a winner.
 * An expired signal is not a current observation (PROTO-11).
 *
 * Contract: glt-specpack/docs/SPEC/degradation.md
 */

import { contractInvalid } from "./errors.ts";
import { snapshotIsStale } from "./freshness.ts";

export const DEGRADE_STEP = "glt.dev.17" as const;

export type ActionKind = "read" | "write" | "runner";

export interface DegradationInput {
  readonly stale: boolean;
  readonly conflict: boolean;
}

export interface DegradationAssessment {
  readonly write_blocked: boolean;
  readonly actions_above: "read";
  readonly stale: boolean;
  readonly conflict: boolean;
}

export interface FactClaim {
  readonly fact_class: string;
  readonly digest: string;
  readonly ref: string;
}

export interface FactConflict {
  readonly conflict: "none" | "source_conflict";
  readonly refs: readonly string[];
}

export interface AgedSignal<T extends string, P extends string = string> {
  readonly value: T;
  readonly provenance: P;
  readonly ageSeconds: number;
}

export function assessDegradation(input: DegradationInput): DegradationAssessment {
  return {
    write_blocked: writeBlocked(input.stale, input.conflict),
    actions_above: "read",
    stale: input.stale,
    conflict: input.conflict,
  };
}

export function actionPermitted(action: ActionKind, input: DegradationInput): boolean {
  if (action === "read") return true;
  return !input.stale && !input.conflict;
}

export function writeBlocked(stale: boolean, conflict: boolean): boolean {
  return !actionPermitted("write", { stale, conflict });
}

/** Drop a signal whose age is past the caller-supplied TTL (PROTO-11). */
export function currentSignal<T extends string, P extends string>(
  signal: AgedSignal<T, P>,
  staleAfterSeconds: number,
): { readonly value: T; readonly provenance: P } | undefined {
  if (!Number.isFinite(signal.ageSeconds) || !Number.isFinite(staleAfterSeconds)) {
    throw contractInvalid("signal age and limit must be finite seconds", ["ageSeconds"]);
  }
  if (snapshotIsStale(signal.ageSeconds, staleAfterSeconds)) return undefined;
  return { value: signal.value, provenance: signal.provenance };
}

/**
 * Two claims of one fact class with different digests. The function names
 * the conflict; it does not choose which digest is true.
 */
export function detectFactConflict(claims: readonly FactClaim[]): FactConflict {
  const byClass = new Map<string, FactClaim[]>();
  for (const claim of claims) {
    const factClass = claim.fact_class.trim();
    if (factClass.length === 0) {
      throw contractInvalid("fact class is required", ["fact_class"]);
    }
    if (claim.digest.trim().length === 0) {
      throw contractInvalid("fact digest is required", [factClass]);
    }
    const group = byClass.get(factClass) ?? [];
    group.push(claim);
    byClass.set(factClass, group);
  }

  const refs: string[] = [];
  for (const [factClass, group] of [...byClass.entries()].sort((a, b) => compare(a[0], b[0]))) {
    const digests = unique(group.map((item) => item.digest));
    if (digests.length > 1) {
      refs.push(factClass, ...unique(group.map((item) => item.ref)));
    }
  }
  return {
    conflict: refs.length > 0 ? "source_conflict" : "none",
    refs,
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compare);
}

function compare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
