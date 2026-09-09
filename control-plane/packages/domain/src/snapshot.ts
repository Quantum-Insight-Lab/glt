/**
 * Topology snapshot compiler (DEV-08). Pure: filesystem stays in
 * `packages/snapshot`. Digest is `digestOf` with the `digest` member omitted
 * (PROTO-03). A second hash would give two answers.
 *
 * Nodes and edges are full objects (PROTO-04). Defaults are explicit
 * (PROTO-05). The snapshot is pinned (PROTO-10).
 */

import { digestOf } from "./digest.ts";
import { contractInvalid, invariantViolated } from "./errors.ts";

const API_VERSION = "glt.dev/v1alpha1" as const;

export interface SnapshotPin {
  readonly git_sha?: string;
  readonly artifact_digest?: string;
  readonly deployment_id?: string;
}

export interface SnapshotNodeDraft {
  readonly id: string;
  readonly revision: number;
  readonly namespace: string;
  readonly title: string;
  readonly aliases: readonly string[];
  readonly declaration: Readonly<Record<string, unknown>>;
}

export interface SnapshotEdgeDraft {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly relation: string;
  readonly assertions: readonly SnapshotAssertion[];
  readonly change: readonly string[];
  readonly incident: readonly string[];
}

export interface SnapshotAssertion {
  readonly plane: string;
  readonly status: string;
  readonly evidence: unknown;
}

export interface SnapshotCompileInput {
  readonly snapshotId: string;
  readonly asOf: string;
  readonly registryVersion: string;
  readonly boundaryId: string;
  readonly sourceDigests: Readonly<Record<string, string>>;
  readonly collectorVersions: Readonly<Record<string, string>>;
  readonly pinnedTo: SnapshotPin;
  readonly nodes: readonly SnapshotNodeDraft[];
  readonly edges: readonly SnapshotEdgeDraft[];
  readonly configProfile?: string;
  readonly matrixVersion?: string;
}

export interface CompiledSnapshot {
  readonly apiVersion: typeof API_VERSION;
  readonly kind: "TopologySnapshot";
  readonly snapshot_id: string;
  readonly as_of: string;
  readonly registry_version: string;
  readonly boundary_id: string;
  readonly pinned_to: SnapshotPin;
  readonly source_digests: Readonly<Record<string, string>>;
  readonly collector_versions: Readonly<Record<string, string>>;
  readonly nodes: readonly unknown[];
  readonly edges: readonly unknown[];
  readonly digest: string;
  readonly config_profile?: string;
  readonly matrix_version?: string;
}

export function compileSnapshot(input: SnapshotCompileInput): CompiledSnapshot {
  if (!isPinned(input.pinnedTo)) {
    throw invariantViolated("PROTO-10", "snapshot is not pinned", [input.snapshotId]);
  }

  rejectIdList(input.nodes, "nodes");
  rejectIdList(input.edges, "edges");

  const nodes = sortByMetadataId(input.nodes.map(materializeNode));
  const edges = sortByMetadataId(input.edges.map(materializeEdge));

  const body: Record<string, unknown> = {
    apiVersion: API_VERSION,
    kind: "TopologySnapshot",
    snapshot_id: input.snapshotId,
    as_of: input.asOf,
    registry_version: input.registryVersion,
    boundary_id: input.boundaryId,
    pinned_to: pinRecord(input.pinnedTo),
    source_digests: sortRecord(input.sourceDigests),
    collector_versions: sortRecord(input.collectorVersions),
    nodes,
    edges,
  };
  if (input.configProfile !== undefined) body["config_profile"] = input.configProfile;
  if (input.matrixVersion !== undefined) body["matrix_version"] = input.matrixVersion;

  const digest = digestOf(body, "digest");
  return { ...(body as unknown as CompiledSnapshot), digest };
}

export function materializeNode(draft: SnapshotNodeDraft): Record<string, unknown> {
  const d = draft.declaration;
  const spec: Record<string, unknown> = {
    type: asString(d["type"], "spec.type"),
    lifecycle: asString(d["lifecycle"], "spec.lifecycle"),
    owner: asString(d["owner"], "spec.owner"),
    criticality: asString(d["criticality"], "spec.criticality"),
    sensitivity: typeof d["sensitivity"] === "string" ? d["sensitivity"] : "internal",
    capabilities: sortStrings(asStringArray(d["capabilities"])),
    signals: sortStrings(asStringArray(d["signals"])),
  };
  const sources = d["sources"];
  if (Array.isArray(sources)) spec["sources"] = sortSources(sources);
  const delivery = d["delivery"];
  if (isRecord(delivery)) spec["delivery"] = materializeDelivery(delivery);

  const metadata: Record<string, unknown> = {
    id: draft.id,
    revision: draft.revision,
    namespace: draft.namespace,
    title: draft.title,
  };
  if (draft.aliases.length > 0) {
    metadata["aliases"] = sortStrings(draft.aliases.map((a) => a.normalize("NFC")));
  }

  return {
    apiVersion: API_VERSION,
    kind: "Node",
    metadata,
    spec,
  };
}

export function materializeEdge(draft: SnapshotEdgeDraft): Record<string, unknown> {
  return {
    apiVersion: API_VERSION,
    kind: "Edge",
    metadata: { id: draft.id },
    spec: {
      from: draft.from,
      to: draft.to,
      relation: draft.relation,
      assertions: [...draft.assertions]
        .map((a) => ({ plane: a.plane, status: a.status, evidence: a.evidence }))
        .sort((a, b) => compare(a.plane, b.plane)),
      propagation: {
        change: sortStrings(draft.change),
        incident: sortStrings(draft.incident),
      },
    },
  };
}

function materializeDelivery(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof raw["expectedFromStep"] === "string") out["expectedFromStep"] = raw["expectedFromStep"];
  if (typeof raw["gate"] === "string") out["gate"] = raw["gate"];
  out["status"] = typeof raw["status"] === "string" ? raw["status"] : "planned";
  return out;
}

function isPinned(pin: SnapshotPin): boolean {
  return (
    hasText(pin.git_sha) || hasText(pin.artifact_digest) || hasText(pin.deployment_id)
  );
}

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.length > 0;
}

function pinRecord(pin: SnapshotPin): SnapshotPin {
  const out: Record<string, string> = {};
  if (hasText(pin.git_sha)) out["git_sha"] = pin.git_sha as string;
  if (hasText(pin.artifact_digest)) out["artifact_digest"] = pin.artifact_digest as string;
  if (hasText(pin.deployment_id)) out["deployment_id"] = pin.deployment_id as string;
  return out;
}

function rejectIdList(items: readonly unknown[], what: string): void {
  for (const item of items) {
    if (typeof item === "string") {
      throw contractInvalid(`${what} must be full objects, not ids`, [item]);
    }
  }
}

function sortByMetadataId(
  items: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  return [...items].sort((a, b) => compare(metadataId(a), metadataId(b)));
}

function metadataId(item: Record<string, unknown>): string {
  const metadata = item["metadata"];
  if (!isRecord(metadata) || typeof metadata["id"] !== "string") return "";
  return metadata["id"];
}

function sortSources(values: readonly unknown[]): Record<string, unknown>[] {
  const sources = values.flatMap((value) => (isRecord(value) ? [value] : []));
  return [...sources].sort((a, b) => {
    const repo = compare(str(a["repository"]), str(b["repository"]));
    if (repo !== 0) return repo;
    const path = compare(str(a["path"]), str(b["path"]));
    return path !== 0 ? path : compare(str(a["selector"]), str(b["selector"]));
  });
}

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort(compare);
}

function sortRecord(record: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(record).sort(compare)) {
    const value = record[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw contractInvalid(`${field} must be a non-empty string`);
  }
  return value;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
