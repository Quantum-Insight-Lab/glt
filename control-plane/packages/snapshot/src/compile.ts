/**
 * Snapshot compiler I/O (DEV-08). Loads registry, boundary and matrix, then
 * compiles in domain. The artifact goes to stdout; v1 never writes
 * `snapshots/` (cli.md). A TopologySnapshot is not a legal input (S-5).
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  PACK,
  PACK_ROOT,
  createValidator,
  loadDocument,
  readText,
  validateAgainst,
} from "@glt/contracts";
import {
  compileSnapshot,
  contractInvalid,
  digestOf,
  digestOfUtf8,
  usageError,
  type CompiledSnapshot,
  type SnapshotEdgeDraft,
  type SnapshotNodeDraft,
  type SnapshotPin,
} from "@glt/domain";
import {
  compileRegistryFromPaths,
  resolveBoundaryPath,
  resolveBundlePath,
} from "@glt/registry";

export interface CompileSnapshotOptions {
  readonly registry?: string;
  readonly boundary?: string;
  readonly matrix?: string;
  readonly asOf?: string;
  readonly pinnedTo?: SnapshotPin;
}

const COLLECTOR_VERSIONS = { intent: "1.0.0", registry: "1.0.0" } as const;
const CONFIG_PROFILE = "bootstrap";

export function compileSnapshotFromPaths(
  options: CompileSnapshotOptions = {},
): CompiledSnapshot {
  const bundlePath = resolveBundlePath(options.registry);
  const bundleText = readText(bundlePath);
  const bundleDoc = loadDocument(bundlePath);
  rejectSnapshotInput(bundleDoc, bundlePath);

  const compiled = compileRegistryFromPaths({
    bundlePath,
    ...(options.boundary !== undefined ? { boundaryRef: options.boundary } : {}),
  });

  const matrixPath = resolveMatrixPath(options.matrix);
  const matrixDoc = loadDocument(matrixPath);
  const matrixErrors = validateAgainst(createValidator(), "propagation-matrix", matrixDoc);
  if (matrixErrors.length > 0) {
    throw contractInvalid(
      matrixErrors.map((e) => `${e.path} ${e.message}`).join("; "),
      [matrixPath],
    );
  }

  const boundaryPath = resolveBoundaryPath(compiled.boundary);
  const sourceDigests = {
    boundary: digestOfUtf8(readText(boundaryPath)),
    propagation_matrix: digestOfUtf8(readText(matrixPath)),
    registry: digestOfUtf8(bundleText),
  };

  const asOf = truncateAsOf(options.asOf ?? new Date().toISOString());
  const matrixVersion = matrixVersionOf(matrixDoc);
  const snapshotId = makeSnapshotId(asOf, {
    as_of: asOf,
    boundary_id: compiled.boundary,
    collector_versions: COLLECTOR_VERSIONS,
    config_profile: CONFIG_PROFILE,
    matrix_version: matrixVersion,
    registry_version: compiled.version,
    source_digests: sourceDigests,
  });

  const sealed = compileSnapshot({
    snapshotId,
    asOf,
    registryVersion: compiled.version,
    boundaryId: compiled.boundary,
    sourceDigests,
    collectorVersions: COLLECTOR_VERSIONS,
    pinnedTo: options.pinnedTo ?? defaultPin(sourceDigests.registry),
    nodes: nodeDrafts(bundleDoc, compiled.entries.map((e) => e.id)),
    edges: edgeDrafts(bundleDoc, compiled.edges.map((e) => e.id)),
    configProfile: CONFIG_PROFILE,
    matrixVersion,
  });

  const problems = validateAgainst(createValidator(), "snapshot", sealed);
  if (problems.length > 0) {
    throw contractInvalid(
      problems.map((e) => `${e.path} ${e.message}`).join("; "),
      [sealed.snapshot_id],
    );
  }
  return sealed;
}

export function renderCompiledSnapshot(snapshot: CompiledSnapshot): string {
  return [
    `snapshot ${snapshot.snapshot_id} ${snapshot.digest}`,
    `boundary ${snapshot.boundary_id} as_of ${snapshot.as_of}`,
    `nodes ${String(snapshot.nodes.length)} edges ${String(snapshot.edges.length)}`,
  ].join("\n");
}

function rejectSnapshotInput(doc: unknown, path: string): void {
  if (isRecord(doc) && doc["kind"] === "TopologySnapshot") {
    throw contractInvalid("compiler does not accept a snapshot as input", [path]);
  }
}

function defaultPin(artifactDigest: string): SnapshotPin {
  const gitSha = readGitSha();
  return gitSha !== undefined
    ? { git_sha: gitSha, artifact_digest: artifactDigest }
    : { artifact_digest: artifactDigest };
}

function readGitSha(): string | undefined {
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    return /^[0-9a-f]{7,40}$/.test(sha) ? sha : undefined;
  } catch {
    return undefined;
  }
}

function truncateAsOf(raw: string): string {
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) throw usageError("invalid --as-of", [raw]);
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function makeSnapshotId(asOf: string, pinIdentity: unknown): string {
  const day = asOf.slice(0, "YYYY-MM-DD".length).replaceAll("-", "");
  const hex = digestOf(pinIdentity).slice("sha256:".length).slice(0, "0123456789ab".length);
  return `snap-${day}-${hex}`;
}

function resolveMatrixPath(flag: string | undefined): string {
  if (flag === undefined || flag.length === 0) return PACK.propagationMatrix;
  if (isAbsolute(flag)) return flag;
  const fromCwd = resolve(flag);
  if (existsSync(fromCwd)) return fromCwd;
  return resolve(PACK_ROOT, flag);
}

function matrixVersionOf(doc: unknown): string {
  if (!isRecord(doc) || !isRecord(doc["metadata"])) {
    throw contractInvalid("propagation matrix metadata missing");
  }
  const version = doc["metadata"]["matrix_version"];
  if (typeof version !== "string" || version.length === 0) {
    throw contractInvalid("propagation matrix metadata.matrix_version missing");
  }
  return version;
}

function nodeDrafts(bundle: unknown, ids: readonly string[]): SnapshotNodeDraft[] {
  const byId = new Map<string, SnapshotNodeDraft>();
  for (const raw of specArray(bundle, "entries")) {
    const metadata = recordOf(raw, "metadata");
    const spec = recordOf(raw, "spec");
    const id = asString(metadata["id"], "metadata.id");
    const node = spec["node"];
    if (!isRecord(node)) throw contractInvalid("registry entry spec.node missing", [id]);
    const aliasesRaw = metadata["aliases"];
    byId.set(id, {
      id,
      revision: asRevision(metadata["revision"]),
      namespace: asString(metadata["namespace"], "metadata.namespace"),
      title: asString(metadata["title"], "metadata.title"),
      aliases: Array.isArray(aliasesRaw)
        ? aliasesRaw.filter((a): a is string => typeof a === "string")
        : [],
      declaration: node,
    });
  }
  return ids.map((id) => {
    const draft = byId.get(id);
    if (draft === undefined) throw contractInvalid("registry entry missing from bundle", [id]);
    return draft;
  });
}

function edgeDrafts(bundle: unknown, ids: readonly string[]): SnapshotEdgeDraft[] {
  const byId = new Map<string, SnapshotEdgeDraft>();
  for (const raw of specArray(bundle, "edges")) {
    const metadata = recordOf(raw, "metadata");
    const spec = recordOf(raw, "spec");
    const id = asString(metadata["id"], "metadata.id");
    const propagation = recordOf(spec, "propagation");
    const assertionsRaw = spec["assertions"];
    if (!Array.isArray(assertionsRaw)) {
      throw contractInvalid("edge spec.assertions missing", [id]);
    }
    byId.set(id, {
      id,
      from: asString(spec["from"], "spec.from"),
      to: asString(spec["to"], "spec.to"),
      relation: asString(spec["relation"], "spec.relation"),
      assertions: assertionsRaw.map(asAssertion),
      change: asStringArray(propagation["change"]),
      incident: asStringArray(propagation["incident"]),
    });
  }
  return ids.map((id) => {
    const draft = byId.get(id);
    if (draft === undefined) throw contractInvalid("edge missing from bundle", [id]);
    return draft;
  });
}

function asAssertion(value: unknown): SnapshotEdgeDraft["assertions"][number] {
  if (!isRecord(value)) throw contractInvalid("edge assertion is not an object");
  return {
    plane: asString(value["plane"], "assertion.plane"),
    status: asString(value["status"], "assertion.status"),
    evidence: value["evidence"] ?? null,
  };
}

function specArray(doc: unknown, key: string): unknown[] {
  if (!isRecord(doc) || !isRecord(doc["spec"]) || !Array.isArray(doc["spec"][key])) {
    throw contractInvalid(`registry bundle spec.${key} missing`);
  }
  return doc["spec"][key] as unknown[];
}

function recordOf(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value[field])) {
    throw contractInvalid(`${field} missing`);
  }
  return value[field] as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw contractInvalid(`${field} must be a non-empty string`);
  }
  return value;
}

function asRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw contractInvalid("metadata.revision must be an integer");
  }
  return value;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
