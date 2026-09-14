import { describe, expect, it } from "vitest";
import {
  RETENTION_PARAM,
  STORE_STEP as AUDIT_STEP,
  applyAuditSchema,
  auditGenesisPrevHash,
  auditRetentionDays,
  createAuditStore,
  rejectAuditPurge,
} from "@glt/audit";
import { EventType, loadJson, PACK } from "@glt/contracts";
import { digestOf, hashAuditRecord, type CompiledSnapshot } from "@glt/domain";
import {
  STORE_STEP,
  applySnapshotSchema,
  createSnapshotStore,
} from "@glt/snapshot";
import { join } from "node:path";
import { openPglite } from "./pglite-sql.ts";

const GOLDEN = join(PACK.examples, "golden", "bootstrap-snapshot.json");

describe("DEV-22 PostgreSQL JSONB store", () => {
  it("is the DEV-22 step", () => {
    expect(STORE_STEP).toBe("glt.dev.22");
    expect(AUDIT_STEP).toBe("glt.dev.22");
  });

  it("PROTO-03 digest after read matches the digest written", async () => {
    const { sql, close } = await openPglite();
    try {
      await applySnapshotSchema(sql);
      const store = createSnapshotStore(sql);
      const snapshot = loadJson<CompiledSnapshot>(GOLDEN);
      await store.put(snapshot);
      const read = await store.get(snapshot.snapshot_id);
      expect(read.digest).toBe(snapshot.digest);
      expect(digestOf(read, "digest")).toBe(snapshot.digest);
      expect(digestOf(read, "digest")).toBe(digestOf(snapshot, "digest"));
    } finally {
      await close();
    }
  });

  it("PROTO-03 a second body under the same snapshot_id is rejected", async () => {
    const { sql, close } = await openPglite();
    try {
      await applySnapshotSchema(sql);
      const store = createSnapshotStore(sql);
      const snapshot = loadJson<CompiledSnapshot>(GOLDEN);
      await store.put(snapshot);
      await expect(store.put(snapshot)).resolves.toEqual(snapshot);
      const draft = { ...snapshot, as_of: "2026-08-15T10:00:00Z" };
      await expect(store.put({ ...draft, digest: digestOf(draft, "digest") })).rejects.toMatchObject({
        invariant: "PROTO-03",
      });
    } finally {
      await close();
    }
  });

  it("PROTO-03 UPDATE of a stored snapshot fails in SQL", async () => {
    const { sql, close } = await openPglite();
    try {
      await applySnapshotSchema(sql);
      const store = createSnapshotStore(sql);
      const snapshot = loadJson<CompiledSnapshot>(GOLDEN);
      await store.put(snapshot);
      await expect(
        sql.query("UPDATE snapshot_blobs SET body = body"),
      ).rejects.toThrow(/immutable/i);
      const read = await store.get(snapshot.snapshot_id);
      expect(read.digest).toBe(snapshot.digest);
    } finally {
      await close();
    }
  });

  it("INV-07 audit append verifies and DELETE is impossible", async () => {
    const { sql, close } = await openPglite();
    try {
      await applyAuditSchema(sql);
      const store = createAuditStore(sql);
      const first = auditRecord("aud-1", auditGenesisPrevHash());
      const second = auditRecord("aud-2", first.record_hash);
      await store.append(first);
      await store.append(second);
      const listed = await store.list();
      expect(listed.map((item) => item.record_id)).toEqual(["aud-1", "aud-2"]);
      await expect(sql.query("DELETE FROM audit_records")).rejects.toThrow(/immutable/i);
      await expect(sql.query("UPDATE audit_records SET prev_hash = prev_hash")).rejects.toThrow(
        /immutable/i,
      );
      expect((await store.list()).length).toBe(2);
    } finally {
      await close();
    }
  });

  it("INV-07 a broken prev_hash is rejected on append", async () => {
    const { sql, close } = await openPglite();
    try {
      await applyAuditSchema(sql);
      const store = createAuditStore(sql);
      const first = auditRecord("aud-1", auditGenesisPrevHash());
      await store.append(first);
      const broken = auditRecord("aud-2", first.prev_hash);
      await expect(store.append(broken)).rejects.toMatchObject({ invariant: "INV-07" });
    } finally {
      await close();
    }
  });

  it("S-8 P05 comes from the card and does not delete", () => {
    expect(auditRetentionDays()).toBeGreaterThan(0);
    expect(RETENTION_PARAM).toContain("retention");
    expect(() => rejectAuditPurge()).toThrow(/append-only/);
  });
});

function auditRecord(record_id: string, prev_hash: string) {
  return {
    record_id,
    prev_hash,
    record_hash: hashAuditRecord({ record_id, prev_hash }),
    timestamp: "2026-08-14T10:00:00Z",
    event_type: EventType.SnapshotCompiled,
  };
}
