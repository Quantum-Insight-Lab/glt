/**
 * Intended meta-graph I/O (DEV-09). Reads component stubs and DEV frontmatter,
 * then compiles in domain. The four-node bootstrap bundle stays the
 * determinism oracle; this boundary is the recall graph.
 */

import { join } from "node:path";
import {
  PACK,
  loadDocument,
  loadPackDocs,
  loadYaml,
  type Frontmatter,
} from "@glt/contracts";
import {
  INTENDED_BOUNDARY_REF,
  assembleIntendedGraph,
  compileRegistry,
  contractInvalid,
  isDevStepId,
  type CompiledRegistry,
  type IntendedComponentStub,
  type IntendedStepCard,
  type RegistryEdgeView,
  type RegistryEntryView,
} from "@glt/domain";

export interface CompiledIntended {
  readonly compiled: CompiledRegistry;
  readonly bundleDoc: Record<string, unknown>;
  readonly boundaryPath: string;
}

export function compileIntendedFromPack(): CompiledIntended {
  const bootstrapDoc = loadDocument(PACK.registryBundle);
  const bootstrap = bundleParts(bootstrapDoc);
  const graph = assembleIntendedGraph({
    bootstrapEntries: bootstrap.entries,
    bootstrapEdges: bootstrap.edges,
    components: loadComponentStubs(),
    steps: loadDevSteps(),
  });
  const compiled = compileRegistry({
    version: bootstrap.version,
    namespace: bootstrap.namespace,
    boundary: INTENDED_BOUNDARY_REF,
    entries: graph.entries.map(viewEntry),
    edges: graph.edges.map(viewEdge),
    boundaryNodes: graph.boundaryNodes,
    boundaryEdges: graph.boundaryEdges,
  });
  const bundleDoc: Record<string, unknown> = {
    apiVersion: "glt.dev/registry/v1",
    kind: "RegistryBundle",
    metadata: {
      version: bootstrap.version,
      boundary: INTENDED_BOUNDARY_REF,
      namespace: bootstrap.namespace,
    },
    spec: { entries: graph.entries, edges: graph.edges },
  };
  return {
    compiled,
    bundleDoc,
    boundaryPath: join(PACK.boundaries, "controlplane-intended.yaml"),
  };
}

function loadComponentStubs(): IntendedComponentStub[] {
  const doc = loadYaml<unknown>(PACK.intendedComponents);
  if (!isRecord(doc) || !Array.isArray(doc["components"])) {
    throw contractInvalid("intended component stubs missing", [PACK.intendedComponents]);
  }
  return doc["components"].map((raw) => {
    if (!isRecord(raw) || typeof raw["id"] !== "string" || !isRecord(raw["source"])) {
      throw contractInvalid("intended component stub is not an object");
    }
    const source = raw["source"];
    return {
      id: raw["id"],
      source: {
        repository: asString(source["repository"], "source.repository"),
        path: asString(source["path"], "source.path"),
        authority: asString(source["authority"], "source.authority"),
        role: asString(source["role"], "source.role"),
      },
    };
  });
}

function loadDevSteps(): IntendedStepCard[] {
  return loadPackDocs().flatMap((doc) => {
    const fm = doc.frontmatter;
    if (fm === undefined || typeof fm.id !== "string" || !isDevStepId(fm.id)) return [];
    return [
      {
        id: fm.id,
        path: `glt-specpack/${doc.path}`,
        title: headingOf(doc.body) ?? fm.id,
        owner: stringField(fm, "owner", "engineering"),
        status: stringField(fm, "status", "planned"),
        dependsOn: stringList(fm.depends_on),
        gate: stringField(fm, "gate", "none"),
        risk: stringField(fm, "risk", "medium"),
      },
    ];
  });
}

function headingOf(body: string): string | undefined {
  const match = body.match(/^#\s+(.+)$/m);
  const title = match?.[1]?.trim();
  return title !== undefined && title.length > 0 ? title : undefined;
}

function stringField(fm: Frontmatter, key: string, fallback: string): string {
  const value = fm[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function bundleParts(doc: unknown): {
  version: string;
  namespace: string;
  entries: Record<string, unknown>[];
  edges: Record<string, unknown>[];
} {
  if (!isRecord(doc) || !isRecord(doc["metadata"]) || !isRecord(doc["spec"])) {
    throw contractInvalid("registry bundle metadata or spec missing");
  }
  const entries = doc["spec"]["entries"];
  const edges = doc["spec"]["edges"];
  if (!Array.isArray(entries) || !Array.isArray(edges)) {
    throw contractInvalid("registry bundle spec.entries/edges missing");
  }
  return {
    version: asString(doc["metadata"]["version"], "metadata.version"),
    namespace:
      typeof doc["metadata"]["namespace"] === "string" ? doc["metadata"]["namespace"] : "",
    entries: entries.filter(isRecord),
    edges: edges.filter(isRecord),
  };
}

function viewEntry(value: Record<string, unknown>): RegistryEntryView {
  const metadata = value["metadata"];
  if (!isRecord(metadata)) throw contractInvalid("registry entry metadata missing");
  const aliasesRaw = metadata["aliases"];
  return {
    id: asString(metadata["id"], "metadata.id"),
    revision: asRevision(metadata["revision"]),
    namespace: asString(metadata["namespace"], "metadata.namespace"),
    aliases: Array.isArray(aliasesRaw)
      ? aliasesRaw.filter((item): item is string => typeof item === "string")
      : [],
    spec: value["spec"],
  };
}

function viewEdge(value: Record<string, unknown>): RegistryEdgeView {
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
