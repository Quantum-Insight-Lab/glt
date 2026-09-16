/**
 * Sandboxed read/build runner (DEV-32). Pure: the plan, catalog and
 * isolation claims arrive already parsed. No filesystem, network, or
 * subprocess (S-1). The container is admitted, not spawned.
 *
 * Deny by default (INV-06). Network is off unless the policy broker
 * granted egress. Branch code is untrusted. The executor image is the
 * envelope digest. Escape attempts E06.1–6 are denied with an audit
 * seal refused. Timeout is the already-resolved P04 value (S-8).
 *
 * Contract: glt-specpack/docs/SECURITY/sandbox.md
 */

import { EventType, type ActionPlan, type ActionSpec, type AuditRecord } from "@glt/contracts";
import { hashAuditRecord } from "./audit-chain.ts";
import { riskFromCapabilities } from "./approve.ts";
import { digestOf, isDigest } from "./digest.ts";
import { contractInvalid, invariantViolated } from "./errors.ts";
import { actionSpecFromUnknown, isForbiddenActionId, type BuiltPlan } from "./plan.ts";
import {
  requireDryRunBeforeWrite,
  type DryRunEvidence,
  type ExternalEffect,
} from "./shadow.ts";
import { containsRawPii, scrubTelemetry } from "./telemetry.ts";

export const SANDBOX_STEP = "glt.dev.32" as const;

export const EscapeScenario = {
  HostMount: "e06.host_mount",
  ResourceExhaustion: "e06.resource_exhaustion",
  MetadataEgress: "e06.metadata_egress",
  WriteOutsideScratch: "e06.write_outside_scratch",
  CredentialExfil: "e06.credential_exfil",
  DockerSocket: "e06.docker_socket",
} as const;

export type EscapeScenario = (typeof EscapeScenario)[keyof typeof EscapeScenario];

export const ESCAPE_SCENARIOS: readonly EscapeScenario[] = [
  EscapeScenario.HostMount,
  EscapeScenario.ResourceExhaustion,
  EscapeScenario.MetadataEgress,
  EscapeScenario.WriteOutsideScratch,
  EscapeScenario.CredentialExfil,
  EscapeScenario.DockerSocket,
];

export interface SandboxMount {
  readonly source: string;
  readonly target: string;
  readonly writable: boolean;
}

export interface SandboxProfile {
  readonly image: string;
  readonly checkout: {
    readonly commit: string;
    readonly trust: string;
    readonly readonly: boolean;
  };
  readonly scratch: {
    readonly path: string;
    readonly max_bytes: number;
  };
  readonly mounts: readonly SandboxMount[];
  readonly network: string;
  readonly egress_grant?: string;
  readonly egress_destinations?: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly docker_socket: boolean;
  readonly host_credentials: boolean;
  readonly seccomp: boolean;
  readonly cgroups: boolean;
  readonly timeout_seconds: number;
  readonly persist?: Record<string, unknown>;
}

export interface SandboxIsolation {
  readonly network: "off" | "egress";
  readonly docker_socket: false;
  readonly host_credentials: false;
  readonly image: string;
  readonly checkout_trust: "untrusted";
}

export interface SandboxAction {
  readonly action_id: string;
  readonly attempt_id: string;
  readonly outcome: "succeeded";
  readonly effects: readonly ExternalEffect[];
}

export interface SandboxReport {
  readonly plan_id: string;
  readonly envelope_digest: string;
  readonly state: "succeeded";
  readonly actions: readonly SandboxAction[];
  readonly effects: readonly ExternalEffect[];
  readonly isolation: SandboxIsolation;
  readonly escape: readonly never[];
}

export interface SandboxRunInput {
  readonly built: BuiltPlan;
  readonly catalog: readonly ActionSpec[];
  readonly profile: SandboxProfile;
  readonly timeout_limit_seconds: number;
  readonly dryRun?: DryRunEvidence;
  readonly writes?: readonly { readonly target: string }[];
}

export function sandboxProfileFor(image: string, timeout_seconds: number): SandboxProfile {
  return {
    image,
    checkout: {
      commit: "5c90ac44026a35701a8b32c14c99c8958ea3c83e",
      trust: "untrusted",
      readonly: true,
    },
    scratch: { path: "/scratch", max_bytes: 1 },
    mounts: [
      { source: "/checkout", target: "/src", writable: false },
      { source: "/scratch", target: "/scratch", writable: true },
    ],
    network: "off",
    env: {},
    docker_socket: false,
    host_credentials: false,
    seccomp: true,
    cgroups: true,
    timeout_seconds,
  };
}

export function admitSandbox(input: {
  readonly profile: SandboxProfile;
  readonly executor_image: string;
  readonly timeout_limit_seconds: number;
  readonly writes?: readonly { readonly target: string }[];
}): SandboxIsolation {
  const denied = classifySandboxDenial(input);
  if (denied !== undefined) {
    throw invariantViolated("INV-06", "sandbox denied an isolation violation", [
      denied,
      input.profile.image,
    ]);
  }
  const network = input.profile.network === "egress" ? "egress" : "off";
  return {
    network,
    docker_socket: false,
    host_credentials: false,
    image: input.profile.image,
    checkout_trust: "untrusted",
  };
}

export function classifySandboxDenial(input: {
  readonly profile: SandboxProfile;
  readonly executor_image: string;
  readonly timeout_limit_seconds: number;
  readonly writes?: readonly { readonly target: string }[];
}): EscapeScenario | undefined {
  const profile = input.profile;
  if (profile.docker_socket || profile.mounts.some(isDockerSocketMount)) {
    return EscapeScenario.DockerSocket;
  }
  if (profile.mounts.some(isHostMount)) {
    return EscapeScenario.HostMount;
  }
  if (
    !profile.seccomp ||
    !profile.cgroups ||
    !Number.isFinite(profile.timeout_seconds) ||
    profile.timeout_seconds <= 0 ||
    !Number.isFinite(input.timeout_limit_seconds) ||
    input.timeout_limit_seconds <= 0 ||
    profile.timeout_seconds > input.timeout_limit_seconds ||
    !Number.isFinite(profile.scratch.max_bytes) ||
    profile.scratch.max_bytes <= 0
  ) {
    return EscapeScenario.ResourceExhaustion;
  }
  if (hasMetadataEgress(profile)) {
    return EscapeScenario.MetadataEgress;
  }
  if (profile.mounts.some((mount) => writesOutsideScratch(mount, profile.scratch.path))) {
    return EscapeScenario.WriteOutsideScratch;
  }
  if ((input.writes ?? []).some((write) => !underPath(write.target, profile.scratch.path))) {
    return EscapeScenario.WriteOutsideScratch;
  }
  if (profile.host_credentials || hasCredentialExfil(profile)) {
    return EscapeScenario.CredentialExfil;
  }
  if (!isDigest(profile.image) || profile.image !== input.executor_image) {
    throw invariantViolated("PROTO-14", "sandbox executor image is not the envelope digest", [
      profile.image,
      input.executor_image,
    ]);
  }
  if (profile.checkout.trust !== "untrusted" || !profile.checkout.readonly) {
    throw invariantViolated("INV-06", "branch under test is untrusted and read-only", [
      profile.checkout.trust,
    ]);
  }
  if (profile.checkout.commit.trim().length === 0) {
    throw contractInvalid("sandbox checkout commit is required");
  }
  if (profile.network !== "off" && profile.network !== "egress") {
    throw invariantViolated("INV-06", "sandbox network is off unless the policy broker grants egress", [
      profile.network,
    ]);
  }
  if (profile.network === "egress") {
    const grant = profile.egress_grant ?? "";
    if (!isDigest(grant)) {
      throw invariantViolated("INV-06", "egress requires a policy-broker grant digest", [grant]);
    }
  }
  if ((profile.egress_destinations ?? []).length > 0 && profile.network !== "egress") {
    throw invariantViolated("INV-06", "sandbox network is off by default", [
      ...(profile.egress_destinations ?? []),
    ]);
  }
  return undefined;
}

export function sandboxRun(input: SandboxRunInput): SandboxReport {
  const isolation = admitSandbox({
    profile: input.profile,
    executor_image: input.built.envelope.executor_image,
    timeout_limit_seconds: input.timeout_limit_seconds,
    ...(input.writes !== undefined ? { writes: input.writes } : {}),
  });
  const catalog = indexCatalog(input.catalog);
  const actions = input.built.plan.actions.map((step) => {
    if (isForbiddenActionId(step.action_id)) {
      throw invariantViolated("PROTO-17", "forbidden verb is not a sandbox action", [step.action_id]);
    }
    const spec = catalog.get(step.action_id);
    if (spec === undefined) {
      throw invariantViolated("PROTO-13", "sandbox action is not in the catalog", [step.action_id]);
    }
    const risk = riskFromCapabilities(spec.capabilities);
    requireDryRunBeforeWrite({
      risk,
      envelope_digest: input.built.plan.envelope_digest,
      ...(input.dryRun !== undefined ? { dryRun: input.dryRun } : {}),
    });
    return {
      action_id: step.action_id,
      attempt_id: digestOf({
        plan_id: input.built.plan.plan_id,
        action_id: step.action_id,
        envelope_digest: input.built.plan.envelope_digest,
      }),
      outcome: "succeeded" as const,
      effects: [] as const,
    };
  });
  const report: SandboxReport = {
    plan_id: input.built.plan.plan_id,
    envelope_digest: input.built.plan.envelope_digest,
    state: "succeeded",
    actions,
    effects: [],
    isolation,
    escape: [],
  };
  assertSandboxed(report);
  return report;
}

export function sandboxedPlan(built: BuiltPlan, report: SandboxReport): ActionPlan {
  if (report.envelope_digest !== built.plan.envelope_digest) {
    throw contractInvalid("sandbox report envelope does not match the plan", [
      report.envelope_digest,
    ]);
  }
  assertSandboxed(report);
  return { ...built.plan, state: "succeeded" };
}

export function assertSandboxed(report: SandboxReport): void {
  if (report.effects.length > 0) {
    throw invariantViolated("INV-06", "sandbox run cannot claim a host effect", [report.plan_id]);
  }
  if (report.isolation.docker_socket !== false || report.isolation.host_credentials !== false) {
    throw invariantViolated("INV-06", "sandbox report claimed a forbidden isolation hole", [
      report.plan_id,
    ]);
  }
  if (report.isolation.checkout_trust !== "untrusted") {
    throw invariantViolated("INV-06", "sandbox report trusted the branch under test", [
      report.plan_id,
    ]);
  }
  if (report.escape.length > 0) {
    throw invariantViolated("INV-06", "sandbox report recorded an unblocked escape", [
      ...report.escape,
    ]);
  }
  for (const action of report.actions) {
    if (action.effects.length > 0) {
      throw invariantViolated("INV-06", "sandbox action cannot claim a host effect", [
        action.action_id,
      ]);
    }
  }
}

export function sandboxAuditRecord(input: {
  readonly report: SandboxReport;
  readonly record_id: string;
  readonly prev_hash: string;
  readonly timestamp: string;
}): AuditRecord {
  assertSandboxed(input.report);
  const recordId = asNonEmpty(input.record_id, "record_id");
  const prevHash = asNonEmpty(input.prev_hash, "prev_hash");
  const timestamp = asNonEmpty(input.timestamp, "timestamp");
  return {
    record_id: recordId,
    prev_hash: prevHash,
    record_hash: hashAuditRecord({ record_id: recordId, prev_hash: prevHash }),
    timestamp,
    event_type: EventType.ActionCompleted,
    payload_digest: digestOf(input.report),
  };
}

function indexCatalog(catalog: readonly ActionSpec[]): Map<string, ActionSpec> {
  const byId = new Map<string, ActionSpec>();
  for (const raw of catalog) {
    const spec = actionSpecFromUnknown(raw);
    if (byId.has(spec.id)) {
      throw contractInvalid("catalog has two ActionSpecs with the same id", [spec.id]);
    }
    byId.set(spec.id, spec);
  }
  return byId;
}

function isDockerSocketMount(mount: SandboxMount): boolean {
  const source = normalizePath(mount.source);
  return (
    source.includes("docker.sock") ||
    source.includes("/var/run") ||
    source.includes("pipe/docker") ||
    source.includes("npipe:")
  );
}

function isHostMount(mount: SandboxMount): boolean {
  const source = normalizePath(mount.source);
  if (isCheckoutSource(source) || isScratchSource(source)) return false;
  return (
    source === "/etc" ||
    source.startsWith("/etc/") ||
    source.startsWith("/home") ||
    source.startsWith("/root") ||
    source.startsWith("/proc") ||
    source.startsWith("/sys") ||
    source.startsWith("/usr") ||
    source.startsWith("/var") ||
    /^[a-z]:\//.test(source)
  );
}

function writesOutsideScratch(mount: SandboxMount, scratch: string): boolean {
  return mount.writable && !underPath(mount.target, scratch);
}

function hasMetadataEgress(profile: SandboxProfile): boolean {
  const destinations = profile.egress_destinations ?? [];
  return destinations.some((dest) => {
    const value = dest.trim().toLowerCase();
    return (
      value.includes("169.254.169.254") ||
      value.includes("169.254.170.2") ||
      value.includes("metadata.google.internal")
    );
  });
}

function hasCredentialExfil(profile: SandboxProfile): boolean {
  for (const [key, value] of Object.entries(profile.env)) {
    if (isCredentialKey(key)) return true;
    if (key.toLowerCase() === "home" && value.trim().length > 0) return true;
  }
  if (profile.persist === undefined) return false;
  if (containsRawPii(profile.persist) || scrubTelemetry(profile.persist).canary_leak) {
    return true;
  }
  return Object.keys(profile.persist).some(isCredentialKey);
}

function isCredentialKey(key: string): boolean {
  const name = key.trim().toLowerCase();
  return (
    name === "authorization" ||
    name === "cookie" ||
    name === "password" ||
    name === "api_key" ||
    name === "apikey" ||
    name.endsWith("_token") ||
    name.endsWith("_secret") ||
    name.endsWith("_password") ||
    name.startsWith("aws_") ||
    name.startsWith("ssh_") ||
    name.startsWith("kube") ||
    name.startsWith("docker_") ||
    name === "google_application_credentials"
  );
}

function isCheckoutSource(source: string): boolean {
  return source === "/checkout" || source === "checkout";
}

function isScratchSource(source: string): boolean {
  return source === "/scratch" || source === "scratch";
}

function underPath(target: string, root: string): boolean {
  const path = normalizePath(target);
  const base = normalizePath(root);
  return path === base || path.startsWith(`${base}/`);
}

function normalizePath(value: string): string {
  return value.trim().replaceAll("\\", "/").replace(/\/+/g, "/").toLowerCase();
}

function asNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw contractInvalid(`${field} is required`);
  return trimmed;
}
