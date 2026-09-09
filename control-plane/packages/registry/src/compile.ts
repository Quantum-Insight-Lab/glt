/**
 * Registry compiler I/O: load the bundle and boundary, schema-validate both
 * with the single ajv (S-4), then compile in domain.
 */

import { isAbsolute, resolve } from "node:path";
import { existsSync } from "node:fs";
import {
  PACK,
  PACK_ROOT,
  createValidator,
  listBoundaryManifests,
  loadDocument,
  validateAgainst,
} from "@glt/contracts";
import {
  compileRegistry,
  contractInvalid,
  usageError,
  type AliasBinding,
  type CompiledRegistry,
  type RegistryEdgeView,
  type RegistryEntryView,
} from "@glt/domain";

export interface CompileRegistryPaths {
  readonly bundlePath?: string;
  readonly boundaryRef?: string;
  readonly previous?: {
    readonly version: string;
    readonly aliases: readonly AliasBinding[];
  };
}

export function resolveBoundaryPath(ref: string): string {
  for (const path of listBoundaryManifests()) {
    const doc = loadDocument(path);
    if (boundaryRefOf(doc) === ref || boundaryIdOf(doc) === ref) return path;
  }
  throw usageError(`boundary ${ref} not found`, [ref]);
}

export function compileRegistryFromPaths(
  options: CompileRegistryPaths = {},
): CompiledRegistry {
  const bundlePath = resolveBundlePath(options.bundlePath);
  const bundleDoc = loadDocument(bundlePath);
  const ajv = createValidator();
  const bundleErrors = validateAgainst(ajv, "registry-bundle", bundleDoc);
  if (bundleErrors.length > 0) {
    throw contractInvalid(
      bundleErrors.map((e) => `${e.path} ${e.message}`).join("; "),
      [bundlePath],
    );
  }

  const bundle = asBundle(bundleDoc);
  const boundaryRef = options.boundaryRef ?? bundle.boundary;
  const boundaryDoc = loadBoundary(boundaryRef);
  const boundaryErrors = validateAgainst(ajv, "boundary-manifest", boundaryDoc);
  if (boundaryErrors.length > 0) {
    throw contractInvalid(
      boundaryErrors.map((e) => `${e.path} ${e.message}`).join("; "),
      [boundaryRef],
    );
  }
  const boundary = asBoundary(boundaryDoc);

  return compileRegistry({
    version: bundle.version,
    namespace: bundle.namespace,
    boundary: bundle.boundary,
    entries: bundle.entries,
    edges: bundle.edges,
    boundaryNodes: boundary.nodes,
    boundaryEdges: boundary.edges,
    ...(options.previous !== undefined ? { previous: options.previous } : {}),
  });
}

export function resolveBundlePath(flag: string | undefined): string {
  if (flag === undefined || flag.length === 0) return PACK.registryBundle;
  if (isAbsolute(flag)) return flag;
  const fromCwd = resolve(flag);
  if (existsSync(fromCwd)) return fromCwd;
  return resolve(PACK_ROOT, flag);
}

function loadBoundary(ref: string): unknown {
  return loadDocument(resolveBoundaryPath(ref));
}

function asBundle(doc: unknown): {
  version: string;
  namespace: string;
  boundary: string;
  entries: RegistryEntryView[];
  edges: RegistryEdgeView[];
} {
  if (!isRecord(doc)) throw contractInvalid("registry bundle is not an object");
  const metadata = doc["metadata"];
  const spec = doc["spec"];
  if (!isRecord(metadata) || !isRecord(spec)) {
    throw contractInvalid("registry bundle metadata or spec missing");
  }
  const version = asString(metadata["version"], "metadata.version");
  const boundary = asString(metadata["boundary"], "metadata.boundary");
  const namespace =
    typeof metadata["namespace"] === "string" ? metadata["namespace"] : "";
  const entriesRaw = spec["entries"];
  const edgesRaw = spec["edges"];
  if (!Array.isArray(entriesRaw) || !Array.isArray(edgesRaw)) {
    throw contractInvalid("registry bundle spec.entries/edges missing");
  }
  return {
    version,
    namespace,
    boundary,
    entries: entriesRaw.map(viewEntry),
    edges: edgesRaw.map(viewEdge),
  };
}

function asBoundary(doc: unknown): { nodes: string[]; edges: string[] } {
  if (!isRecord(doc)) throw contractInvalid("boundary manifest is not an object");
  const spec = doc["spec"];
  if (!isRecord(spec) || !Array.isArray(spec["nodes"]) || !Array.isArray(spec["edges"])) {
    throw contractInvalid("boundary manifest spec.nodes/edges missing");
  }
  return {
    nodes: spec["nodes"].filter((n): n is string => typeof n === "string"),
    edges: spec["edges"].filter((n): n is string => typeof n === "string"),
  };
}

function viewEntry(value: unknown): RegistryEntryView {
  if (!isRecord(value)) throw contractInvalid("registry entry is not an object");
  const metadata = value["metadata"];
  if (!isRecord(metadata)) throw contractInvalid("registry entry metadata missing");
  const aliasesRaw = metadata["aliases"];
  return {
    id: asString(metadata["id"], "metadata.id"),
    revision: asRevision(metadata["revision"]),
    namespace: asString(metadata["namespace"], "metadata.namespace"),
    aliases: Array.isArray(aliasesRaw)
      ? aliasesRaw.filter((a): a is string => typeof a === "string")
      : [],
    spec: value["spec"],
  };
}

function viewEdge(value: unknown): RegistryEdgeView {
  if (!isRecord(value)) throw contractInvalid("edge is not an object");
  const metadata = value["metadata"];
  const spec = value["spec"];
  if (!isRecord(metadata) || !isRecord(spec)) {
    throw contractInvalid("edge metadata or spec missing");
  }
  return {
    id: asString(metadata["id"], "metadata.id"),
    from: asString(spec["from"], "spec.from"),
    to: asString(spec["to"], "spec.to"),
  };
}

function boundaryRefOf(doc: unknown): string {
  const id = boundaryIdOf(doc);
  const revision = boundaryRevisionOf(doc);
  return `${id}@${revision}`;
}

function boundaryIdOf(doc: unknown): string {
  if (!isRecord(doc) || !isRecord(doc["metadata"])) return "";
  return typeof doc["metadata"]["id"] === "string" ? doc["metadata"]["id"] : "";
}

function boundaryRevisionOf(doc: unknown): string {
  if (!isRecord(doc) || !isRecord(doc["metadata"])) return "";
  const revision = doc["metadata"]["revision"];
  return typeof revision === "number" || typeof revision === "string" ? String(revision) : "";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
