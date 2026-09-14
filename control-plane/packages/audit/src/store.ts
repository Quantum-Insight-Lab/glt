/**
 * Audit store — DEV-22. PostgreSQL JSONB, insert-only.
 * Hash is hashAuditRecord (S-4). Verify-on-read is verifyAuditChain (INV-07).
 * P05 does not delete. This step does not emit events.
 *
 * Contract: glt-specpack/docs/SPEC/audit.md
 */
import {
  EventType,
  createValidator,
  loadParameterCards,
  validateAgainst,
  type AuditRecord,
} from "@glt/contracts";
import {
  contractInvalid,
  hashAuditRecord,
  invariantViolated,
  parameterSpecFromCard,
  parameterValue,
  verifyAuditChain,
} from "@glt/domain";
import { AUDIT_SCHEMA } from "./schema.ts";
import type { SqlExec } from "./sql.ts";

export const STORE_STEP = "glt.dev.22" as const;
export const RETENTION_PARAM = "glt.param.audit.retention_days" as const;

const REGISTERED_EVENTS = new Set<string>(Object.values(EventType));

export interface AuditStore {
  readonly append: (record: AuditRecord) => Promise<AuditRecord>;
  readonly list: () => Promise<readonly AuditRecord[]>;
}

export function applyAuditSchema(sql: SqlExec): Promise<void> {
  return sql.exec(AUDIT_SCHEMA);
}

export function auditGenesisPrevHash(): string {
  return hashAuditRecord({ record_id: "genesis", prev_hash: "" });
}

export function auditRetentionDays(): number {
  for (const card of loadParameterCards()) {
    const spec = parameterSpecFromCard(card);
    if (spec.id === RETENTION_PARAM) return parameterValue(spec);
  }
  throw contractInvalid("parameter card missing", [RETENTION_PARAM]);
}

/** Retention names visibility, not a delete. */
export function rejectAuditPurge(): never {
  throw invariantViolated(
    "INV-07",
    "audit table is append-only; retention does not delete",
    [RETENTION_PARAM],
  );
}

export function createAuditStore(sql: SqlExec): AuditStore {
  const ajv = createValidator();
  return {
    async append(record) {
      const sealed = checkedRecord(ajv, record);
      const existing = await byId(sql, sealed.record_id);
      if (existing !== undefined) {
        if (existing.record_hash !== sealed.record_hash) {
          throw invariantViolated("INV-07", "audit record is immutable after append", [
            sealed.record_id,
          ]);
        }
        return existing;
      }
      const head = await lastHash(sql);
      const expectedPrev = head ?? auditGenesisPrevHash();
      if (sealed.prev_hash !== expectedPrev) {
        throw invariantViolated("INV-07", "audit prev_hash does not follow the chain", [
          sealed.record_id,
        ]);
      }
      await sql.query(
        "INSERT INTO audit_records (record_id, record_hash, prev_hash, body) VALUES ($1, $2, $3, $4::jsonb)",
        [sealed.record_id, sealed.record_hash, sealed.prev_hash, JSON.stringify(sealed)],
      );
      return sealed;
    },

    async list() {
      const rows = await sql.query(
        "SELECT body FROM audit_records ORDER BY seq ASC",
      );
      const records = rows.map((row) => checkedRecord(ajv, jsonObject(row["body"])));
      const verified = verifyAuditChain(
        records.map((record) => ({
          record_id: record.record_id,
          prev_hash: record.prev_hash,
          record_hash: record.record_hash,
        })),
      );
      if (!verified.ok) {
        throw invariantViolated("INV-07", "stored audit chain does not verify", verified.refs);
      }
      return records;
    },
  };
}

function checkedRecord(ajv: ReturnType<typeof createValidator>, raw: unknown): AuditRecord {
  const problems = validateAgainst(ajv, "audit-record", raw);
  if (problems.length > 0) {
    throw contractInvalid(problems.map((item) => `${item.path} ${item.message}`).join("; "));
  }
  const record = raw as AuditRecord;
  if (!REGISTERED_EVENTS.has(record.event_type)) {
    throw contractInvalid("event_type is not in the registry", [record.event_type]);
  }
  const expected = hashAuditRecord({
    record_id: record.record_id,
    prev_hash: record.prev_hash,
  });
  if (record.record_hash !== expected) {
    throw invariantViolated("INV-07", "audit record_hash mismatch", [record.record_id]);
  }
  return record;
}

async function byId(sql: SqlExec, recordId: string): Promise<AuditRecord | undefined> {
  const rows = await sql.query("SELECT body FROM audit_records WHERE record_id = $1", [recordId]);
  const row = rows[0];
  if (row === undefined) return undefined;
  return jsonObject(row["body"]) as unknown as AuditRecord;
}

async function lastHash(sql: SqlExec): Promise<string | undefined> {
  const rows = await sql.query("SELECT record_hash FROM audit_records ORDER BY seq DESC LIMIT 1");
  const hash = rows[0]?.["record_hash"];
  return typeof hash === "string" ? hash : undefined;
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") return JSON.parse(value) as Record<string, unknown>;
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw contractInvalid("stored audit body is not an object");
}
