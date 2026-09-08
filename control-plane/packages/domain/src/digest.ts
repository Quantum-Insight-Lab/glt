import { createHash } from "node:crypto";
import { canonicalize } from "./canonical.ts";

/**
 * The single digest function (S-4, PROTO-03). Format `sha256:` + hex.
 *
 * Digest is taken over JCS bytes, never over pretty-printed file bytes.
 * The `digest` member, when present, is stripped before hashing — same rule
 * as snapshots.md, so a stored digest cannot feed itself.
 */

const DIGEST_PREFIX = "sha256:" as const;

type Digest = `${typeof DIGEST_PREFIX}${string}`;

/** The only `createHash("sha256")` call site in our code (S-4). */
export function sha256Bytes(data: string | Uint8Array): Buffer {
  return createHash("sha256").update(data).digest();
}

function formatDigest(bytes: Buffer): Digest {
  return `${DIGEST_PREFIX}${bytes.toString("hex")}`;
}

export function digestOf(value: unknown, omit?: string): Digest {
  const payload = omit === undefined ? value : omitMember(value, omit);
  return formatDigest(sha256Bytes(canonicalize(payload)));
}

function omitMember(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  delete copy[key];
  return copy;
}
