/**
 * `glt health` — DEV-16/17. Snapshot freshness, node axes, write block and
 * source conflict. Classifies only. Does not write the workspace.
 *
 * Stale snapshot: warn on stderr; artifact on stdout; write/runner blocked.
 * Threshold is P01 from the parameter card (S-8).
 *
 * Contract: glt-specpack/docs/SPEC/cli.md, topology.md, degradation.md
 */

import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  REPO_ROOT,
  loadJson,
  loadParameterCards,
} from "@glt/contracts";
import {
  contractInvalid,
  evaluateState,
  healthExit,
  parameterSpecFromCard,
  parameterValue,
  usageError,
  type CompiledSnapshot,
  type DeliveryState,
  type NodeStateDraft,
  type TopologyState,
} from "@glt/domain";
import { compileSnapshotFromPaths } from "@glt/snapshot";
import type { Writer } from "./output.ts";

const STALE_PARAM = "glt.param.snapshot.stale_after_seconds";

const DELIVERY: readonly DeliveryState[] = [
  "planned",
  "ready",
  "in_progress",
  "verified",
  "blocked",
];

export interface HealthCliOptions {
  readonly registry?: string;
  readonly boundary?: string;
  readonly snapshot?: string;
  readonly asOf?: string;
}

export interface HealthReport extends TopologyState {
  readonly snapshot_id: string;
  readonly snapshot_digest: string;
  readonly as_of: string;
  readonly age_seconds: number;
  readonly stale_after_seconds: number;
}

export function runHealth(writer: Writer, options: HealthCliOptions = {}): number {
  try {
    const report = collectHealth(options);
    if (report.snapshot_freshness === "stale") {
      writer.warn("snapshot older than P01; write and runner blocked");
    }
    if (report.conflict === "source_conflict") {
      writer.warn("source_conflict; actions above read are blocked");
    }
    writer.artifact(report, renderHealthReport);
    return healthExit(report);
  } catch (error) {
    return writer.fail(error);
  }
}

export function collectHealth(options: HealthCliOptions = {}): HealthReport {
  const snapshot = loadOrCompileSnapshot(options);
  const asOf = truncateAsOf(options.asOf ?? new Date().toISOString());
  const age = ageSeconds(snapshot.as_of, asOf);
  if (age === undefined) {
    throw contractInvalid("snapshot as_of is not a valid timestamp", [snapshot.as_of]);
  }
  const staleAfterSeconds = staleAfter();
  const classified = evaluateState({
    nodes: nodeDrafts(snapshot),
    ageSeconds: age,
    staleAfterSeconds,
  });
  return {
    snapshot_id: snapshot.snapshot_id,
    snapshot_digest: snapshot.digest,
    as_of: snapshot.as_of,
    age_seconds: age,
    stale_after_seconds: staleAfterSeconds,
    snapshot_freshness: classified.snapshot_freshness,
    conflict: classified.conflict,
    write_blocked: classified.write_blocked,
    actions_above: classified.actions_above,
    nodes: classified.nodes,
    known_unknowns: classified.known_unknowns,
  };
}

export function renderHealthReport(report: HealthReport): string {
  return [
    `health ${report.snapshot_id} ${report.snapshot_digest}`,
    `freshness ${report.snapshot_freshness} age ${String(report.age_seconds)} ttl ${String(report.stale_after_seconds)}`,
    `write_blocked ${String(report.write_blocked)} conflict ${report.conflict}`,
    `nodes ${String(report.nodes.length)} unknowns ${String(report.known_unknowns.length)}`,
  ].join("\n");
}

function nodeDrafts(snapshot: CompiledSnapshot): NodeStateDraft[] {
  return snapshot.nodes.flatMap((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return [];
    const rec = item as Record<string, unknown>;
    const metadata = rec["metadata"];
    if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) return [];
    const id = (metadata as Record<string, unknown>)["id"];
    if (typeof id !== "string" || id.length === 0) return [];
    const spec = rec["spec"];
    const delivery = deliveryOf(spec);
    return delivery !== undefined ? [{ id, delivery }] : [{ id }];
  });
}

function deliveryOf(spec: unknown): DeliveryState | undefined {
  if (spec === null || typeof spec !== "object" || Array.isArray(spec)) return undefined;
  const delivery = (spec as Record<string, unknown>)["delivery"];
  if (delivery === null || typeof delivery !== "object" || Array.isArray(delivery)) return undefined;
  const status = (delivery as Record<string, unknown>)["status"];
  if (typeof status !== "string") return undefined;
  return (DELIVERY as readonly string[]).includes(status) ? (status as DeliveryState) : undefined;
}

function loadOrCompileSnapshot(options: HealthCliOptions): CompiledSnapshot {
  if (options.snapshot !== undefined && options.snapshot.length > 0) {
    const path = isAbsolute(options.snapshot) ? options.snapshot : resolve(REPO_ROOT, options.snapshot);
    if (!existsSync(path)) throw usageError("snapshot not found", [path]);
    const doc = loadJson<CompiledSnapshot>(path);
    if (doc.kind !== "TopologySnapshot") {
      throw contractInvalid("health --snapshot must be a TopologySnapshot", [path]);
    }
    if (typeof doc.digest !== "string" || doc.digest.length === 0) {
      throw contractInvalid("snapshot digest missing", [path]);
    }
    return doc;
  }
  return compileSnapshotFromPaths({
    ...(options.registry !== undefined ? { registry: options.registry } : {}),
    ...(options.boundary !== undefined ? { boundary: options.boundary } : {}),
    ...(options.asOf !== undefined ? { asOf: options.asOf } : {}),
  });
}

function staleAfter(): number {
  for (const card of loadParameterCards()) {
    const spec = parameterSpecFromCard(card);
    if (spec.id === STALE_PARAM) return parameterValue(spec);
  }
  throw contractInvalid("parameter card missing", [STALE_PARAM]);
}

function ageSeconds(producedAt: string, asOf: string): number | undefined {
  const start = Date.parse(producedAt);
  const end = Date.parse(asOf);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  return Math.floor((end - start) / 1000);
}

function truncateAsOf(raw: string): string {
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) throw usageError("invalid --as-of", [raw]);
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}
