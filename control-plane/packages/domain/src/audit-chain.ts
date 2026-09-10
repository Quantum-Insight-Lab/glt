/**
 * Audit hash-chain verify (DEV-12 holdout H05 / INV-07). Pure: records arrive
 * already loaded. Digest is the single sha256 in digest.ts (S-4).
 *
 * Tampering a prev_hash or record_hash is detectable. Repairing the chain by
 * recomputing hashes is forbidden — that erases the break (audit.md).
 */

import { digestOf } from "./digest.ts";

export interface AuditChainLink {
  readonly record_id: string;
  readonly prev_hash: string;
  readonly record_hash: string;
}

export interface AuditChainResult {
  readonly ok: boolean;
  readonly refs: readonly string[];
}

export function verifyAuditChain(records: readonly AuditChainLink[]): AuditChainResult {
  for (let i = 0; i < records.length; i += 1) {
    const rec = records[i];
    if (rec === undefined) continue;
    const expected = digestOf(rec, "record_hash");
    if (rec.record_hash !== expected) {
      return { ok: false, refs: [rec.record_id] };
    }
    if (i > 0) {
      const prev = records[i - 1];
      if (prev !== undefined && rec.prev_hash !== prev.record_hash) {
        return { ok: false, refs: [rec.record_id] };
      }
    }
  }
  return { ok: true, refs: [] };
}

export function hashAuditRecord(record: Omit<AuditChainLink, "record_hash">): string {
  return digestOf(record, "record_hash");
}
