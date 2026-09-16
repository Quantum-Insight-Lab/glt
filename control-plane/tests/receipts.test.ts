import { describe, expect, it } from "vitest";
import { applyAuditSchema, auditGenesisPrevHash, createAuditStore } from "@glt/audit";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import { EventType, createValidator, validateAgainst } from "@glt/contracts";
import {
  RECEIPT_STEP,
  attemptAuditRecord,
  buildPlan,
  reconcileAuditRecord,
  recordAttempt,
} from "@glt/domain";
import { completedOutcomeEvent, runReconcile } from "@glt/runner";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { openPglite } from "./pglite-sql.ts";

const POLICY = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EXECUTOR = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SNAPSHOT = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

describe("DEV-33 receipts client", () => {
  it("is the DEV-33 step", () => {
    expect(RECEIPT_STEP).toBe("glt.dev.33");
  });

  it("S-5 a reconcile writes nothing to the workspace", () => {
    const built = plan();
    const attempt = recordAttempt({
      plan_id: built.plan.plan_id,
      action_id: "typecheck",
      envelope_digest: built.plan.envelope_digest,
    });
    const executed = runReconcile({
      plan: built.plan,
      attempt,
      prior: "unknown_outcome",
    });
    expect(executed.plan.state).toBe("unknown_outcome");
    expect(executed.report.is_success).toBe(false);
    expect(executed.events[0]?.event_type).toBe(EventType.ActionCompleted);
    expect(executed.events[0]).toEqual(
      completedOutcomeEvent(executed.report.attempt_id, "unknown_outcome"),
    );
    expect(validateAgainst(createValidator(), "action-plan", executed.plan)).toEqual([]);
    expect(existsSync(join(process.cwd(), "plan-receipt-live"))).toBe(false);
  });

  it("INV-07 the write-ahead attempt and the reconcile append as two records", async () => {
    const built = plan();
    const attempt = recordAttempt({
      plan_id: built.plan.plan_id,
      action_id: "typecheck",
      envelope_digest: built.plan.envelope_digest,
    });
    const first = attemptAuditRecord({
      attempt,
      record_id: "aud-receipt-attempt",
      prev_hash: auditGenesisPrevHash(),
      timestamp: "2026-08-14T10:00:00Z",
    });
    const executed = runReconcile({
      plan: built.plan,
      attempt,
      prior: "unknown_outcome",
      target: { checkable: true, observed: false, idempotency_key: attempt.attempt_id },
    });
    expect(executed.plan.state).toBe("failed");
    const second = reconcileAuditRecord({
      report: executed.report,
      record_id: "aud-receipt-reconcile",
      prev_hash: first.record_hash,
      timestamp: "2026-08-14T10:01:00Z",
    });
    expect(validateAgainst(createValidator(), "audit-record", first)).toEqual([]);
    expect(validateAgainst(createValidator(), "audit-record", second)).toEqual([]);
    expect(first.event_type).toBe(EventType.ActionStarted);
    expect(second.event_type).toBe(EventType.ActionCompleted);

    const { sql, close } = await openPglite();
    try {
      await applyAuditSchema(sql);
      const store = createAuditStore(sql);
      await store.append(first);
      await store.append(second);
      const listed = await store.list();
      expect(listed).toHaveLength(2);
      expect(listed[1]?.prev_hash).toBe(listed[0]?.record_hash);
    } finally {
      await close();
    }
  });

  it("S-10 glt reconcile is not a command", () => {
    const names = COMMANDS.map((command) => command.name);
    expect(names).not.toContain("reconcile");
    expect(names).not.toContain("retry");
    expect(names).not.toContain("receipt");
    expect(FORBIDDEN_COMMANDS).not.toContain("reconcile");
  });
});

function plan() {
  return buildPlan({
    plan_id: "plan-receipt-live",
    catalog: [{ id: "typecheck", revision: 1, capabilities: ["typecheck"], risk_class: "read" }],
    actions: [{ action_id: "typecheck", depends_on: [] }],
    digests: { policy: POLICY, executor_image: EXECUTOR, snapshot: SNAPSHOT },
  });
}
