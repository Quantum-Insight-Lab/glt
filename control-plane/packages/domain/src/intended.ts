/**
 * Intended meta-graph (DEV-09). Pure: DEV cards and component stubs arrive
 * already parsed. Filesystem stays in `packages/registry`.
 *
 * Status, depends_on and expected_from_step come from DEV frontmatter.
 * Hand-authored facts are only GLT-ID and SourceRef on component stubs.
 */

import { contractInvalid } from "./errors.ts";

export const INTENDED_BOUNDARY_ID = "glt.controlplane-intended";
export const INTENDED_BOUNDARY_REF = `${INTENDED_BOUNDARY_ID}@1`;

const API_VERSION = "glt.dev/v1alpha1" as const;
const ENTRY_KIND = "RegistryEntry" as const;
const EDGE_KIND = "Edge" as const;
const NAMESPACE = "glt.controlplane";
const STEP_ID = /^glt\.dev\.\d+$/;

export interface IntendedSourceRef {
  readonly repository: string;
  readonly path: string;
  readonly authority: string;
  readonly role: string;
}

export interface IntendedComponentStub {
  readonly id: string;
  readonly source: IntendedSourceRef;
}

export interface IntendedStepCard {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly owner: string;
  readonly status: string;
  readonly dependsOn: readonly string[];
  readonly gate: string;
  readonly risk: string;
}

export interface IntendedGraph {
  readonly boundary: string;
  readonly entries: readonly Record<string, unknown>[];
  readonly edges: readonly Record<string, unknown>[];
  readonly boundaryNodes: readonly string[];
  readonly boundaryEdges: readonly string[];
}

export function isIntendedBoundaryRef(ref: string | undefined): boolean {
  return ref === INTENDED_BOUNDARY_REF || ref === INTENDED_BOUNDARY_ID;
}

export function isDevStepId(id: string): boolean {
  return STEP_ID.test(id);
}

export function assembleIntendedGraph(input: {
  readonly bootstrapEntries: readonly Record<string, unknown>[];
  readonly bootstrapEdges: readonly Record<string, unknown>[];
  readonly components: readonly IntendedComponentStub[];
  readonly steps: readonly IntendedStepCard[];
}): IntendedGraph {
  const stepIds = new Set(input.steps.map((step) => step.id));
  for (const step of input.steps) {
    if (!isDevStepId(step.id)) {
      throw contractInvalid("intended step id is not a DEV step", [step.id]);
    }
    for (const dep of step.dependsOn) {
      if (!stepIds.has(dep)) {
        throw contractInvalid("depends_on names a step that is not in the graph", [step.id, dep]);
      }
    }
  }

  const bootstrapIds = new Set(
    input.bootstrapEntries.map((entry) => entryId(entry)).filter((id) => id.length > 0),
  );
  const componentEntries = input.components
    .filter((stub) => !bootstrapIds.has(stub.id))
    .map(componentEntry);
  const stepEntries = input.steps.map(stepEntry);
  const stepEdges = input.steps.flatMap(stepDependsEdges);
  const entries = [...input.bootstrapEntries, ...componentEntries, ...stepEntries];
  const edges = [...input.bootstrapEdges, ...stepEdges];
  return {
    boundary: INTENDED_BOUNDARY_REF,
    entries,
    edges,
    boundaryNodes: entries.map(entryId),
    boundaryEdges: edges.map(edgeId),
  };
}

function componentEntry(stub: IntendedComponentStub): Record<string, unknown> {
  const id = stub.id.normalize("NFC");
  const title = lastSegment(id);
  return {
    apiVersion: API_VERSION,
    kind: ENTRY_KIND,
    metadata: {
      id,
      revision: 1,
      namespace: NAMESPACE,
      title,
    },
    spec: {
      kind: "node",
      description: title,
      node: {
        type: "tool",
        lifecycle: "planned",
        owner: "engineering",
        criticality: "high",
        sources: [
          {
            repository: stub.source.repository,
            path: stub.source.path,
            authority: stub.source.authority,
            role: stub.source.role,
          },
        ],
        delivery: {
          status: "planned",
        },
      },
    },
  };
}

function stepEntry(step: IntendedStepCard): Record<string, unknown> {
  const accepted = step.status === "accepted";
  const delivery: Record<string, string> = {
    expectedFromStep: step.id,
    status: accepted ? "verified" : "planned",
  };
  if (step.gate !== "none" && step.gate.length > 0) delivery["gate"] = step.gate;
  return {
    apiVersion: API_VERSION,
    kind: ENTRY_KIND,
    metadata: {
      id: step.id.normalize("NFC"),
      revision: 1,
      namespace: NAMESPACE,
      title: step.title,
    },
    spec: {
      kind: "node",
      description: step.title,
      node: {
        type: "tool",
        lifecycle: accepted ? "active" : "planned",
        owner: step.owner,
        criticality: criticalityOf(step.risk),
        sources: [
          {
            repository: "glt-controlplane",
            path: step.path,
            authority: "intended-topology",
            role: "derived-from",
          },
        ],
        delivery,
      },
    },
  };
}

function stepDependsEdges(step: IntendedStepCard): Record<string, unknown>[] {
  return step.dependsOn.map((dep) => {
    const id = `glt.edge.${step.id}-depends-${dep}`;
    return {
      apiVersion: API_VERSION,
      kind: EDGE_KIND,
      metadata: { id },
      spec: {
        from: step.id,
        to: dep,
        relation: "depends_on",
        assertions: [
          {
            plane: "intended",
            status: "asserted",
            evidence: {
              repository: "glt-controlplane",
              path: step.path,
              authority: "intended-topology",
              role: "derived-from",
            },
          },
          { plane: "materialized", status: "not_observed", evidence: null },
          { plane: "observed", status: "not_observed", evidence: null },
        ],
        propagation: {
          change: ["dependency", "interface", "schema"],
          incident: ["availability"],
        },
      },
    };
  });
}

function criticalityOf(risk: string): string {
  if (risk === "low" || risk === "medium" || risk === "high" || risk === "critical") return risk;
  return "high";
}

function lastSegment(id: string): string {
  const parts = id.split(".");
  return parts[parts.length - 1] ?? id;
}

function entryId(entry: Record<string, unknown>): string {
  const metadata = entry["metadata"];
  if (!isRecord(metadata) || typeof metadata["id"] !== "string") return "";
  return metadata["id"];
}

function edgeId(edge: Record<string, unknown>): string {
  const metadata = edge["metadata"];
  if (!isRecord(metadata) || typeof metadata["id"] !== "string") return "";
  return metadata["id"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
