/**
 * The single error type (S-4) and the exit code contract from
 * glt-specpack/docs/SPEC/cli.md.
 *
 * Codes are stable and machine-checkable: CI must be able to tell "the graph
 * says no" (4, 5, 6) from "the tool is broken" (1, 70). Codes 2 and 3 stay
 * distinct because a schema-valid artifact can still violate a protocol
 * invariant.
 */
export const ExitCode = {
  Success: 0,
  Usage: 1,
  ContractInvalid: 2,
  InvariantViolation: 3,
  PolicyDenied: 4,
  EvidenceInsufficient: 5,
  SourceConflict: 6,
  Internal: 70,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

/** `PROTO-03`, `INV-07`, `S-1` — the id of the rule that was broken, when one applies. */
export type InvariantId = `PROTO-${string}` | `INV-${string}` | `S-${string}`;

export interface GltErrorInit {
  readonly code: ExitCode;
  readonly message: string;
  readonly invariant?: InvariantId;
  /** Node ids, edge ids, snapshot ids, paths — whatever makes the failure locatable. */
  readonly refs?: readonly string[];
}

/**
 * An error never claims more certainty than the graph supports: an unresolvable
 * alias reports unknown rather than a guess (PROTO-02).
 */
export class GltError extends Error {
  readonly code: ExitCode;
  readonly invariant: InvariantId | undefined;
  readonly refs: readonly string[];

  constructor(init: GltErrorInit) {
    super(init.message);
    this.name = "GltError";
    this.code = init.code;
    this.invariant = init.invariant;
    this.refs = init.refs ?? [];
  }

  /** Machine-readable form for stderr, one object per line. */
  toJSON(): Record<string, unknown> {
    const out: Record<string, unknown> = { code: this.code, message: this.message };
    if (this.invariant !== undefined) out["invariant"] = this.invariant;
    if (this.refs.length > 0) out["refs"] = this.refs;
    return out;
  }
}

export const usageError = (message: string, refs?: readonly string[]): GltError =>
  new GltError({ code: ExitCode.Usage, message, ...(refs ? { refs } : {}) });

export const contractInvalid = (message: string, refs?: readonly string[]): GltError =>
  new GltError({ code: ExitCode.ContractInvalid, message, ...(refs ? { refs } : {}) });

export const invariantViolated = (
  invariant: InvariantId,
  message: string,
  refs?: readonly string[],
): GltError =>
  new GltError({
    code: ExitCode.InvariantViolation,
    invariant,
    message,
    ...(refs ? { refs } : {}),
  });

/**
 * Absence of a signal is never success. A command that cannot establish its
 * answer reports this, not zero (PROTO-12).
 */
export const evidenceInsufficient = (message: string, refs?: readonly string[]): GltError =>
  new GltError({ code: ExitCode.EvidenceInsufficient, message, ...(refs ? { refs } : {}) });

/** Two authoritative sources of one fact class disagree. Actions above read are blocked. */
export const sourceConflict = (
  message: string,
  refs?: readonly string[],
  invariant?: InvariantId,
): GltError =>
  new GltError({
    code: ExitCode.SourceConflict,
    message,
    ...(invariant ? { invariant } : {}),
    ...(refs ? { refs } : {}),
  });
