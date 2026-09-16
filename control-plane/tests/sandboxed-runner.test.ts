import { describe, expect, it } from "vitest";
import { applyAuditSchema, auditGenesisPrevHash, createAuditStore } from "@glt/audit";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import { EventType, createValidator, validateAgainst, type ActionSpec } from "@glt/contracts";
import { SANDBOX_STEP, buildPlan, sandboxAuditRecord, sandboxProfileFor } from "@glt/domain";
import { actionCompletedEvent, runSandbox, runnerTimeoutSeconds } from "@glt/runner";
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

describe("DEV-32 sandboxed runner client", () => {
  it("is the DEV-32 step", () => {
    expect(SANDBOX_STEP).toBe("glt.dev.32");
  });

  it("S-5 S-8 an admitted run emits ActionCompleted and writes nothing to the workspace", () => {
    const built = buildPlan({
      plan_id: "plan-sandbox-live",
      catalog: [TYPECHECK],
      actions: [{ action_id: "typecheck", depends_on: [] }],
      digests: { policy: POLICY, executor_image: EXECUTOR, snapshot: SNAPSHOT },
    });
    const executed = runSandbox({
      built,
      catalog: [TYPECHECK],
      profile: sandboxProfileFor(EXECUTOR, runnerTimeoutSeconds()),
    });
    expect(executed.plan.state).toBe("succeeded");
    expect(executed.report.isolation.network).toBe("off");
    expect(executed.report.isolation.docker_socket).toBe(false);
    expect(executed.report.isolation.host_credentials).toBe(false);
    expect(executed.report.isolation.checkout_trust).toBe("untrusted");
    expect(executed.report.isolation.image).toBe(EXECUTOR);
    expect(executed.events).toHaveLength(1);
    expect(executed.events[0]?.event_type).toBe(EventType.ActionCompleted);
    expect(executed.events[0]).toEqual(
      actionCompletedEvent(executed.report.actions[0]!),
    );
    expect(validateAgainst(createValidator(), "action-plan", executed.plan)).toEqual([]);
    expect(existsSync(join(process.cwd(), "plan-sandbox-live"))).toBe(false);
  });

  it("INV-07 the completed run is appended to the audit chain", async () => {
    const built = buildPlan({
      plan_id: "plan-sandbox-audit",
      catalog: [TYPECHECK],
      actions: [{ action_id: "typecheck", depends_on: [] }],
      digests: { policy: POLICY, executor_image: EXECUTOR, snapshot: SNAPSHOT },
    });
    const executed = runSandbox({
      built,
      catalog: [TYPECHECK],
      profile: sandboxProfileFor(EXECUTOR, runnerTimeoutSeconds()),
    });
    const record = sandboxAuditRecord({
      report: executed.report,
      record_id: "aud-sandbox-live",
      prev_hash: auditGenesisPrevHash(),
      timestamp: "2026-08-14T10:00:00Z",
    });
    expect(validateAgainst(createValidator(), "audit-record", record)).toEqual([]);
    expect(record.event_type).toBe(EventType.ActionCompleted);

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

  it("S-10 glt run is not a command", () => {
    const names = COMMANDS.map((command) => command.name);
    expect(names).not.toContain("run");
    expect(names).not.toContain("sandbox");
    expect(names).not.toContain("execute");
    expect(FORBIDDEN_COMMANDS).not.toContain("run");
  });
});
