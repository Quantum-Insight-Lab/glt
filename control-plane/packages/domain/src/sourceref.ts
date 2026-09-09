/**
 * SourceRef selectors, evidence pins, and locator uniqueness (DEV-07).
 * Pure: filesystem stays in `packages/snapshot`.
 *
 * Unknown or ambiguous never becomes the first candidate (PROTO-02).
 * Absence of a target is not success.
 */

import { canonicalize } from "./canonical.ts";
import { contractInvalid, evidenceInsufficient, invariantViolated, usageError } from "./errors.ts";
import type { CompiledRegistry } from "./resolve.ts";

export interface SourceRefView {
  readonly repository: string;
  readonly path: string;
  readonly authority?: string;
  readonly commit?: string;
  readonly selector?: string;
  readonly digest?: string;
  readonly role?: string;
}

export type ResolveInput =
  | { readonly kind: "json"; readonly raw: string }
  | { readonly kind: "path"; readonly path: string }
  | { readonly kind: "locator"; readonly locator: string };

export type Selector =
  | { readonly kind: "none" }
  | { readonly kind: "lines"; readonly start: number; readonly end: number }
  | { readonly kind: "pointer"; readonly pointer: string };

export type UsableAs = "navigation" | "evidence";

export interface LocatorMatch {
  readonly semantic_id: string;
  readonly revision: number;
  readonly namespace: string;
  readonly via: "id" | "alias";
}

export type ResolvedRef =
  | {
      readonly kind: "locator";
      readonly locator: string;
      readonly semantic_id: string;
      readonly revision: number;
      readonly namespace: string;
      readonly via: "id" | "alias";
      readonly usable_as: "navigation";
    }
  | {
      readonly kind: "source_ref";
      readonly repository: string;
      readonly path: string;
      readonly digest: string;
      readonly usable_as: UsableAs;
      readonly excerpt: string;
      readonly commit?: string;
      readonly selector?: string;
      readonly authority?: string;
      readonly role?: string;
    };

/**
 * Classify by form, never by whether a file exists. Existence is I/O and
 * guessing `docs/SPEC/...` vs `glt-specpack/docs/...` is the same defect as
 * guessing an unknown alias (PROTO-02).
 */
export function classifyResolveInput(raw: string): ResolveInput {
  const trimmed = raw.trim();
  if (trimmed.length === 0) throw usageError("glt resolve requires a ref");
  if (trimmed.startsWith("{")) return { kind: "json", raw: trimmed };
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return { kind: "path", path: trimmed.replaceAll("\\", "/") };
  }
  return { kind: "locator", locator: trimmed };
}

export function parseSelector(raw: string | undefined): Selector {
  if (raw === undefined || raw.length === 0) return { kind: "none" };
  if (raw.startsWith("/")) return { kind: "pointer", pointer: raw };
  const lines = raw.match(/^lines:(\d+)-(\d+)$/);
  if (lines !== null) {
    const start = Number(lines[1]);
    const end = Number(lines[2]);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      throw contractInvalid("invalid lines selector", [raw]);
    }
    return { kind: "lines", start, end };
  }
  throw contractInvalid("unknown selector", [raw]);
}

export function applyLineRange(text: string, start: number, end: number): string {
  const lines = text.split("\n");
  if (end > lines.length) {
    throw evidenceInsufficient("line selector out of range", [String(start), String(end)]);
  }
  return lines.slice(start - 1, end).join("\n");
}

export function applyJsonPointer(doc: unknown, pointer: string): unknown {
  if (pointer.length === 0) return doc;
  if (!pointer.startsWith("/")) {
    throw contractInvalid("JSON Pointer must start with /", [pointer]);
  }
  const tokens = pointer.slice(1).split("/").map(decodePointerToken);
  let current: unknown = doc;
  for (const token of tokens) {
    current = stepPointer(current, token, pointer);
  }
  return current;
}

export function applySelector(
  text: string,
  selector: Selector,
  structured: unknown | undefined,
): string {
  if (selector.kind === "none") return text;
  if (selector.kind === "lines") return applyLineRange(text, selector.start, selector.end);
  if (structured === undefined) {
    throw contractInvalid("JSON Pointer requires YAML or JSON", [selector.pointer]);
  }
  return canonicalize(applyJsonPointer(structured, selector.pointer));
}

export function requireEvidencePins(ref: SourceRefView): void {
  if (!needsPins(ref.role)) return;
  if (hasPin(ref.commit) && hasPin(ref.digest)) return;
  throw evidenceInsufficient("commit and digest are required for evidence", [ref.path]);
}

export function usableAs(ref: SourceRefView, digestMatched: boolean): UsableAs {
  if (hasPin(ref.commit) && hasPin(ref.digest) && digestMatched) return "evidence";
  return "navigation";
}

export function assertDigestMatch(expected: string, actual: string): void {
  if (expected === actual) return;
  throw evidenceInsufficient("digest mismatch", [expected]);
}

/**
 * Collect id and alias hits, then require exactly one semantic id.
 * Never returns `hits[0]` of a longer list (PROTO-02).
 */
export function uniqueLocator(compiled: CompiledRegistry, raw: string): LocatorMatch {
  const needle = raw.normalize("NFC");
  const byId = new Map<string, LocatorMatch>();

  for (const entry of compiled.entries) {
    if (entry.id.normalize("NFC") !== needle) continue;
    byId.set(entry.id, {
      semantic_id: entry.id,
      revision: entry.revision,
      namespace: entry.namespace,
      via: "id",
    });
  }

  for (const binding of compiled.aliases) {
    if (binding.alias !== needle) continue;
    if (byId.has(binding.semantic_id)) continue;
    byId.set(binding.semantic_id, {
      semantic_id: binding.semantic_id,
      revision: binding.revision,
      namespace: binding.namespace,
      via: "alias",
    });
  }

  const hits = [...byId.values()].sort((a, b) => compare(a.semantic_id, b.semantic_id));
  const refs = hits.map((h) => h.semantic_id);
  if (hits.length === 0) {
    throw invariantViolated("PROTO-02", "unknown locator", [raw]);
  }
  if (hits.length !== 1) {
    throw invariantViolated("PROTO-02", "ambiguous locator", refs);
  }
  return hits[0]!;
}

function needsPins(role: string | undefined): boolean {
  return role === "evidence" || role === "approval" || role === "gate";
}

function hasPin(value: string | undefined): boolean {
  return value !== undefined && value.length > 0;
}

function decodePointerToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function stepPointer(current: unknown, token: string, pointer: string): unknown {
  if (Array.isArray(current)) {
    if (!isArrayIndex(token)) {
      throw evidenceInsufficient("json pointer target not found", [pointer]);
    }
    const index = Number(token);
    if (index >= current.length) {
      throw evidenceInsufficient("json pointer target not found", [pointer]);
    }
    return current[index];
  }
  if (current !== null && typeof current === "object") {
    const record = current as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, token)) {
      throw evidenceInsufficient("json pointer target not found", [pointer]);
    }
    return record[token];
  }
  throw evidenceInsufficient("json pointer target not found", [pointer]);
}

function isArrayIndex(token: string): boolean {
  if (token.length === 0) return false;
  if (token === "0") return true;
  if (token.startsWith("0")) return false;
  for (const char of token) {
    if (char < "0" || char > "9") return false;
  }
  return true;
}

function compare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
