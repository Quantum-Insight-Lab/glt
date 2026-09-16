import { describe, expect, it } from "vitest";
import { EventType, loadParameterCards, type ActionSpec } from "@glt/contracts";
import { digestOf } from "./digest.ts";
import { GltError } from "./errors.ts";
import { hashAuditRecord } from "./audit-chain.ts";
import { parameterSpecFromCard, parameterValue } from "./params.ts";
import { buildPlan } from "./plan.ts";
import {
  ESCAPE_SCENARIOS,
  EscapeScenario,
  SANDBOX_STEP,
  admitSandbox,
  assertSandboxed,
  classifySandboxDenial,
  sandboxAuditRecord,
  sandboxProfileFor,
  sandboxRun,
  sandboxedPlan,
  type SandboxProfile,
  type SandboxReport,
} from "./sandbox.ts";

const POLICY = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EXECUTOR = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SNAPSHOT = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const GRANT = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

const TYPECHECK: ActionSpec = {
  id: "typecheck",
  revision: 1,
  capabilities: ["typecheck"],
  risk_class: "read",
};

const TIMEOUT_PARAM = "glt.param.runner.default_timeout_seconds";

describe("DEV-32 sandboxed runner", () => {
  it("is the DEV-32 step", () => {
    expect(SANDBOX_STEP).toBe("glt.dev.32");
  });

  it("INV-06 a legal profile is admitted with network off and an untrusted checkout", () => {
    const profile = legal();
    const isolation = admitSandbox(pins(profile));
    expect(isolation.network).toBe("off");
    expect(isolation.docker_socket).toBe(false);
    expect(isolation.host_credentials).toBe(false);
    expect(isolation.checkout_trust).toBe("untrusted");
    expect(isolation.image).toBe(EXECUTOR);
    const report = sandboxRun({ built: built(), catalog: [TYPECHECK], ...pins(profile) });
    expect(report.state).toBe("succeeded");
    expect(report.effects).toEqual([]);
    expect(report.escape).toEqual([]);
    expect(report.actions[0]?.outcome).toBe("succeeded");
    expect(sandboxedPlan(built(), report).state).toBe("succeeded");
  });

  it("E06 INV-06 host path mount is denied", () => {
    expectEscape(withMount("/etc", "/mnt/etc", false), EscapeScenario.HostMount);
    expectEscape(withMount("/home/alice", "/mnt/home", false), EscapeScenario.HostMount);
    expectEscape(withMount("C:\\Windows", "/mnt/win", false), EscapeScenario.HostMount);
  });

  it("E06 INV-06 fork bomb without cgroups or seccomp is denied", () => {
    expectEscape({ ...legal(), seccomp: false }, EscapeScenario.ResourceExhaustion);
    expectEscape({ ...legal(), cgroups: false }, EscapeScenario.ResourceExhaustion);
    expectEscape({ ...legal(), timeout_seconds: timeoutLimit() + 1 }, EscapeScenario.ResourceExhaustion);
  });

  it("E06 INV-06 egress to a metadata service is denied", () => {
    expectEscape(
      {
        ...legal(),
        network: "egress",
        egress_grant: GRANT,
        egress_destinations: ["http://169.254.169.254/latest/meta-data"],
      },
      EscapeScenario.MetadataEgress,
    );
    expectEscape(
      {
        ...legal(),
        network: "egress",
        egress_grant: GRANT,
        egress_destinations: ["metadata.google.internal"],
      },
      EscapeScenario.MetadataEgress,
    );
  });

  it("E06 INV-06 write outside scratch is denied", () => {
    expectEscape(withMount("/scratch", "/etc/passwd", true), EscapeScenario.WriteOutsideScratch);
    expectThrown(
      () =>
        sandboxRun({
          built: built(),
          catalog: [TYPECHECK],
          ...pins(legal()),
          writes: [{ target: "/etc/shadow" }],
        }),
      "INV-06",
    );
  });

  it("E06 INV-06 credential exfil in env or persist is denied", () => {
    expectEscape(
      { ...legal(), env: { AWS_SECRET_ACCESS_KEY: "x" } },
      EscapeScenario.CredentialExfil,
    );
    expectEscape(
      { ...legal(), persist: { password: "hunter2" } },
      EscapeScenario.CredentialExfil,
    );
    expectEscape(
      { ...legal(), persist: { "service.name": "glt-dlp-canary" } },
      EscapeScenario.CredentialExfil,
    );
    expectEscape({ ...legal(), host_credentials: true }, EscapeScenario.CredentialExfil);
  });

  it("E06 INV-06 docker socket and host /var/run are denied", () => {
    expectEscape({ ...legal(), docker_socket: true }, EscapeScenario.DockerSocket);
    expectEscape(withMount("/var/run/docker.sock", "/var/run/docker.sock", false), EscapeScenario.DockerSocket);
    expectEscape(withMount("/var/run", "/host-run", false), EscapeScenario.DockerSocket);
  });

  it("E06 INV-06 every escape scenario is classified and blocked", () => {
    expect(ESCAPE_SCENARIOS).toHaveLength(6);
    const attempts: readonly SandboxProfile[] = [
      withMount("/etc", "/mnt/etc", false),
      { ...legal(), seccomp: false },
      {
        ...legal(),
        network: "egress",
        egress_grant: GRANT,
        egress_destinations: ["169.254.169.254"],
      },
      withMount("/scratch", "/tmp/host", true),
      { ...legal(), persist: { api_key: "k" } },
      { ...legal(), docker_socket: true },
    ];
    const blocked = attempts.map((profile) => classifySandboxDenial(pins(profile)));
    expect(blocked).toEqual([...ESCAPE_SCENARIOS]);
    expect(blocked.every((id) => id !== undefined)).toBe(true);
  });

  it("INV-06 network stays off without a policy-broker grant", () => {
    expectThrown(() => admitSandbox(pins({ ...legal(), network: "egress" })), "INV-06");
    expectThrown(
      () =>
        admitSandbox(
          pins({
            ...legal(),
            egress_destinations: ["https://example.invalid"],
          }),
        ),
      "INV-06",
    );
    const granted = admitSandbox(
      pins({
        ...legal(),
        network: "egress",
        egress_grant: GRANT,
        egress_destinations: ["https://policy.broker.local"],
      }),
    );
    expect(granted.network).toBe("egress");
  });

  it("INV-06 the branch under test cannot be marked trusted", () => {
    expectThrown(
      () => admitSandbox(pins({ ...legal(), checkout: { ...legal().checkout, trust: "trusted" } })),
      "INV-06",
    );
  });

  it("PROTO-14 a floating tag is not a pinned executor image", () => {
    expectThrown(() => admitSandbox(pins({ ...legal(), image: "glt-executor:latest" })), "PROTO-14");
    expectThrown(
      () =>
        admitSandbox(
          pins({
            ...legal(),
            image: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          }),
        ),
      "PROTO-14",
    );
  });

  it("INV-06 a claimed host effect cannot be sealed", () => {
    const report = forged({ kind: "write_file", target: "/etc/passwd" });
    expectThrown(() => assertSandboxed(report), "INV-06");
    expectThrown(
      () =>
        sandboxAuditRecord({
          report,
          record_id: "aud-sandbox-1",
          prev_hash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          timestamp: "2026-08-14T10:00:00Z",
        }),
      "INV-06",
    );
  });

  it("seals a completed run as an audit record", () => {
    const report = sandboxRun({ built: built(), catalog: [TYPECHECK], ...pins(legal()) });
    const prev = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
    const record = sandboxAuditRecord({
      report,
      record_id: "aud-sandbox-1",
      prev_hash: prev,
      timestamp: "2026-08-14T10:00:00Z",
    });
    expect(record.event_type).toBe(EventType.ActionCompleted);
    expect(record.payload_digest).toBe(digestOf(report));
    expect(record.record_hash).toBe(hashAuditRecord({ record_id: record.record_id, prev_hash: prev }));
  });
});

function timeoutLimit(): number {
  for (const card of loadParameterCards()) {
    const spec = parameterSpecFromCard(card);
    if (spec.id === TIMEOUT_PARAM) return parameterValue(spec);
  }
  throw new Error("missing runner timeout parameter");
}

function legal(): SandboxProfile {
  return sandboxProfileFor(EXECUTOR, timeoutLimit());
}

function pins(profile: SandboxProfile) {
  return { profile, executor_image: EXECUTOR, timeout_limit_seconds: timeoutLimit() };
}

function withMount(source: string, target: string, writable: boolean): SandboxProfile {
  return { ...legal(), mounts: [...legal().mounts, { source, target, writable }] };
}

function built() {
  return buildPlan({
    plan_id: "plan-sandbox",
    catalog: [TYPECHECK],
    actions: [{ action_id: "typecheck", depends_on: [] }],
    digests: { policy: POLICY, executor_image: EXECUTOR, snapshot: SNAPSHOT },
  });
}

function forged(effect: { kind: string; target: string }): SandboxReport {
  const report = sandboxRun({ built: built(), catalog: [TYPECHECK], ...pins(legal()) });
  return { ...report, effects: [effect] };
}

function expectEscape(profile: SandboxProfile, escape: EscapeScenario): void {
  expect(classifySandboxDenial(pins(profile))).toBe(escape);
  expectThrown(() => admitSandbox(pins(profile)), "INV-06");
}

function expectThrown(run: () => void, invariant: string): void {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(GltError);
  expect((caught as GltError).invariant).toBe(invariant);
}
