import { describe, expect, it } from "vitest";
import { applyAuditSchema, auditGenesisPrevHash, createAuditStore } from "@glt/audit";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import { EventType, createValidator, validateAgainst, type ActionSpec } from "@glt/contracts";
import { SHADOW_STEP, buildPlan, shadowAuditRecord } from "@glt/domain";
import { actionStartedEvent, runShadow } from "@glt/runner";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { openPglite } from "./pglite-sql.ts";

const POLICY = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EXECUTOR = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SNAPSHOT = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

const TYPECHECK: ActionSpec = {
  id: "typecheck",
  revision: 1,
  capabilities: ["typecheck"],
  risk_class: "read",
};

describe("DEV-31 shadow runner client", () => {
  it("is the DEV-31 step", () => {
    expect(SHADOW_STEP).toBe("glt.dev.31");
  });

  it("S-5 a dry-run emits ActionStarted and writes nothing to the workspace", () => {
    const built = buildPlan({
      plan_id: "plan-shadow-live",
      catalog: [TYPECHECK],
      actions: [{ action_id: "typecheck", depends_on: [] }],
      digests: { policy: POLICY, executor_image: EXECUTOR, snapshot: SNAPSHOT },
    });
    const shadowed = runShadow({ built, catalog: [TYPECHECK] });
    expect(shadowed.plan.state).toBe("dry_run");
    expect(shadowed.report.effects).toEqual([]);
    expect(shadowed.events).toHaveLength(1);
    expect(shadowed.events[0]?.event_type).toBe(EventType.ActionStarted);
    expect(shadowed.events[0]).toEqual(
      actionStartedEvent(shadowed.report.plan_id, shadowed.report.actions[0]!),
    );
    expect(validateAgainst(createValidator(), "action-plan", shadowed.plan)).toEqual([]);
    expect(existsSync(join(process.cwd(), "plan-shadow-live"))).toBe(false);
  });

  it("INV-07 the dry-run result is appended to the audit chain", async () => {
    const built = buildPlan({
      plan_id: "plan-shadow-audit",
      catalog: [TYPECHECK],
      actions: [{ action_id: "typecheck", depends_on: [] }],
      digests: { policy: POLICY, executor_image: EXECUTOR, snapshot: SNAPSHOT },
    });
    const shadowed = runShadow({ built, catalog: [TYPECHECK] });
    const record = shadowAuditRecord({
      report: shadowed.report,
      record_id: "aud-shadow-live",
      prev_hash: auditGenesisPrevHash(),
      timestamp: "2026-08-14T10:00:00Z",
    });
    expect(validateAgainst(createValidator(), "audit-record", record)).toEqual([]);
    expect(record.event_type).toBe(EventType.ActionStarted);

    const { sql, close } = await openPglite();
    try {
      await applyAuditSchema(sql);
      const store = createAuditStore(sql);
      const stored = await store.append(record);
      const listed = await store.list();
      expect(stored.record_hash).toBe(record.record_hash);
      expect(listed).toHaveLength(1);
      expect(listed[0]?.payload_digest).toBe(record.payload_digest);
    } finally {
      await close();
    }
  });

  it("S-10 glt shadow is not a command", () => {
    const names = COMMANDS.map((command) => command.name);
    expect(names).not.toContain("shadow");
    expect(names).not.toContain("run");
    expect(FORBIDDEN_COMMANDS).not.toContain("shadow");
  });
});
