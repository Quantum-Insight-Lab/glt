/**
 * Snapshot store — DEV-22. PostgreSQL JSONB, content-addressed by digest.
 * Put seals the id. Read recomputes digestOf (PROTO-03). No workspace write.
 *
 * Contract: glt-specpack/docs/SPEC/snapshots.md
 */
import { createValidator, validateAgainst } from "@glt/contracts";
import {
  digestOf,
  evidenceInsufficient,
  invariantViolated,
  type CompiledSnapshot,
} from "@glt/domain";
import { SNAPSHOT_SCHEMA } from "./schema.ts";
import type { SqlExec } from "./sql.ts";

export const STORE_STEP = "glt.dev.22" as const;

export interface SnapshotStore {
  readonly put: (snapshot: CompiledSnapshot) => Promise<CompiledSnapshot>;
  readonly get: (snapshotId: string) => Promise<CompiledSnapshot>;
}

export function applySnapshotSchema(sql: SqlExec): Promise<void> {
  return sql.exec(SNAPSHOT_SCHEMA);
}

export function createSnapshotStore(sql: SqlExec): SnapshotStore {
  const ajv = createValidator();
  return {
    async put(snapshot) {
      const sealed = checkedSnapshot(ajv, snapshot);
      const existing = await lookup(sql, sealed.snapshot_id);
      if (existing !== undefined) {
        if (existing.digest !== sealed.digest) {
          throw invariantViolated("PROTO-03", "snapshot is immutable after write", [
            sealed.snapshot_id,
          ]);
        }
        return existing.body;
      }
      await sql.query(
        "INSERT INTO snapshot_blobs (digest, body) VALUES ($1, $2::jsonb) ON CONFLICT (digest) DO NOTHING",
        [sealed.digest, JSON.stringify(sealed)],
      );
      await sql.query("INSERT INTO snapshots (snapshot_id, digest) VALUES ($1, $2)", [
        sealed.snapshot_id,
        sealed.digest,
      ]);
      return sealed;
    },

    async get(snapshotId) {
      const existing = await lookup(sql, snapshotId);
      if (existing === undefined) {
        throw evidenceInsufficient("snapshot not in store", [snapshotId]);
      }
      return checkedSnapshot(ajv, existing.body, existing.digest);
    },
  };
}

function checkedSnapshot(
  ajv: ReturnType<typeof createValidator>,
  raw: unknown,
  storedDigest?: string,
): CompiledSnapshot {
  const problems = validateAgainst(ajv, "snapshot", raw);
  if (problems.length > 0) {
    throw invariantViolated(
      "PROTO-03",
      problems.map((item) => `${item.path} ${item.message}`).join("; "),
    );
  }
  const snapshot = raw as CompiledSnapshot;
  const computed = digestOf(snapshot, "digest");
  if (snapshot.digest !== computed) {
    throw invariantViolated("PROTO-03", "snapshot digest mismatch", [snapshot.snapshot_id]);
  }
  if (storedDigest !== undefined && storedDigest !== computed) {
    throw invariantViolated("PROTO-03", "stored snapshot digest mismatch", [snapshot.snapshot_id]);
  }
  return snapshot;
}

async function lookup(
  sql: SqlExec,
  snapshotId: string,
): Promise<{ digest: string; body: CompiledSnapshot } | undefined> {
  const rows = await sql.query(
    `SELECT s.digest AS digest, b.body AS body
     FROM snapshots s
     JOIN snapshot_blobs b ON b.digest = s.digest
     WHERE s.snapshot_id = $1`,
    [snapshotId],
  );
  const row = rows[0];
  if (row === undefined) return undefined;
  const digest = row["digest"];
  if (typeof digest !== "string") {
    throw invariantViolated("PROTO-03", "stored snapshot digest missing", [snapshotId]);
  }
  return { digest, body: jsonObject(row["body"]) as unknown as CompiledSnapshot };
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") return JSON.parse(value) as Record<string, unknown>;
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw invariantViolated("PROTO-03", "stored snapshot body is not an object");
}
