/**
 * DEV-11 catalog loader. Experiment YAML is the authorized set; tests compare
 * the engine to ground truth already written there. This module does not
 * invent affected_nodes.
 */

import { PACK, loadYaml } from "@glt/contracts";
import {
  computeImpact,
  type ComputeImpactInput,
  type ImpactEdgeView,
  type ImpactNodeView,
  type ImpactReportView,
  type ImpactUnknown,
} from "@glt/domain";
import { impactMaxTraversalDepth, loadPropagationMatrix } from "@glt/impact";

const CHANGE_CLASSES = [
  "content",
  "schema",
  "interface",
  "behavior",
  "dependency",
  "configuration",
  "policy",
  "infrastructure",
] as const;

const MATRIX_RELATIONS = [
  "depends_on",
  "calls",
  "reads",
  "consumes",
  "validates",
  "gates",
  "conflicts_with",
] as const;

export interface SeededUnknown {
  readonly kind: ImpactUnknown["kind"];
  readonly ref: string;
}

export interface SeededCase {
  readonly id: string;
  readonly paths: readonly string[];
  readonly labels: readonly string[];
  readonly affected: readonly string[];
  readonly requiredChecks: readonly string[];
  readonly unknownsExpected: boolean;
  readonly unknowns: readonly SeededUnknown[];
  readonly authoredBy: string;
  readonly rationale: string;
  readonly relations: readonly string[];
}

export interface SeededGraph {
  readonly boundaryId: string;
  readonly snapshotId: string;
  readonly nodes: readonly ImpactNodeView[];
  readonly edges: readonly ImpactEdgeView[];
  readonly boundaryNodes: readonly string[];
}

export interface SeededCatalog {
  readonly version: string;
  readonly reviewStatus: string;
  readonly graph: SeededGraph;
  readonly cases: readonly SeededCase[];
}

export function loadSeededCatalog(): SeededCatalog {
  return parseSeededCatalog(loadYaml(PACK.seededChanges));
}

export function parseSeededCatalog(raw: unknown): SeededCatalog {
  if (!isRecord(raw)) throw new Error("seeded catalog is not an object");
  const metadata = raw["metadata"];
  const review = raw["independent_review"];
  const graphRaw = raw["graph"];
  const casesRaw = raw["cases"];
  if (!isRecord(metadata) || typeof metadata["version"] !== "string") {
    throw new Error("seeded catalog metadata.version missing");
  }
  if (!isRecord(review) || typeof review["status"] !== "string") {
    throw new Error("seeded catalog independent_review.status missing");
  }
  if (!isRecord(graphRaw) || !Array.isArray(casesRaw)) {
    throw new Error("seeded catalog graph/cases missing");
  }
  return {
    version: metadata["version"],
    reviewStatus: review["status"],
    graph: parseGraph(graphRaw),
    cases: casesRaw.map(parseCase),
  };
}

export function catalogProblems(catalog: SeededCatalog): string[] {
  const problems: string[] = [];
  if (catalog.reviewStatus !== "limitation-recorded") {
    problems.push("independent_review.status must be limitation-recorded");
  }
  if (catalog.cases.length < 10) {
    problems.push(`need ≥10 cases, got ${String(catalog.cases.length)}`);
  }
  const classes = new Set(catalog.cases.flatMap((item) => item.labels));
  for (const cls of CHANGE_CLASSES) {
    if (!classes.has(cls)) problems.push(`missing change class ${cls}`);
  }
  const relations = new Set(catalog.cases.flatMap((item) => item.relations));
  for (const rel of MATRIX_RELATIONS) {
    if (!relations.has(rel)) problems.push(`missing matrix relation ${rel}`);
  }
  const outside = catalog.cases.filter((item) =>
    item.unknowns.some((unknown) => unknown.kind === "outside_boundary"),
  );
  if (outside.length < 2) {
    problems.push(`need ≥2 cases leaving the boundary, got ${String(outside.length)}`);
  }
  const uncovered = catalog.cases.filter((item) =>
    item.unknowns.some((unknown) => unknown.kind === "uncovered_relation"),
  );
  if (uncovered.length < 1) problems.push("need ≥1 uncovered_relation case");
  for (const item of catalog.cases) {
    if (item.authoredBy.length === 0) problems.push(`${item.id} authored_by missing`);
    if (item.rationale.trim().length === 0) problems.push(`${item.id} rationale missing`);
    if (!/glt\.edge\.\S+/.test(item.rationale)) {
      problems.push(`${item.id} rationale has no edge id`);
    }
    const needsMatrixRow = item.relations.length > 0;
    if (needsMatrixRow && !/glt\.prop\.change\.\S+/.test(item.rationale)) {
      problems.push(`${item.id} rationale has no matrix row id`);
    }
    const expected = item.unknowns.length > 0;
    if (item.unknownsExpected !== expected) {
      problems.push(`${item.id} known_unknowns_expected does not match the list`);
    }
  }
  return problems;
}

export function computeSeededCase(catalog: SeededCatalog, item: SeededCase): ImpactReportView {
  const path = item.paths[0];
  if (path === undefined) throw new Error(`${item.id} has no change path`);
  const input: ComputeImpactInput = {
    reportId: `imp-${item.id.toLowerCase()}`,
    snapshotId: catalog.graph.snapshotId,
    snapshotDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    boundaryId: catalog.graph.boundaryId,
    nodes: catalog.graph.nodes,
    edges: catalog.graph.edges,
    boundaryNodes: catalog.graph.boundaryNodes,
    matrix: loadPropagationMatrix(),
    sources: [
      {
        repository: "glt-controlplane",
        path,
        authority: "engineering-contract",
        role: "changed",
      },
    ],
    maxDepth: impactMaxTraversalDepth(),
    labels: item.labels,
  };
  return computeImpact(input);
}

export function unknownKeys(report: ImpactReportView): SeededUnknown[] {
  return report.known_unknowns.map((item) => ({ kind: item.kind, ref: item.ref }));
}

function parseGraph(raw: Record<string, unknown>): SeededGraph {
  const boundaryId = raw["boundary_id"];
  const snapshotId = raw["snapshot_id"];
  const nodesRaw = raw["nodes"];
  const edgesRaw = raw["edges"];
  const boundaryRaw = raw["boundary_nodes"];
  if (typeof boundaryId !== "string" || typeof snapshotId !== "string") {
    throw new Error("seeded graph ids missing");
  }
  if (!Array.isArray(nodesRaw) || !Array.isArray(edgesRaw) || !Array.isArray(boundaryRaw)) {
    throw new Error("seeded graph nodes/edges/boundary_nodes missing");
  }
  return {
    boundaryId,
    snapshotId,
    nodes: nodesRaw.map(parseNode),
    edges: edgesRaw.map(parseEdge),
    boundaryNodes: boundaryRaw.filter((item): item is string => typeof item === "string"),
  };
}

function parseNode(raw: unknown): ImpactNodeView {
  if (!isRecord(raw) || typeof raw["id"] !== "string" || typeof raw["path"] !== "string") {
    throw new Error("seeded node needs id and path");
  }
  return { id: raw["id"], sources: [{ path: raw["path"], repository: "glt-controlplane" }] };
}

function parseEdge(raw: unknown): ImpactEdgeView {
  if (!isRecord(raw)) throw new Error("seeded edge is not an object");
  const id = raw["id"];
  const from = raw["from"];
  const to = raw["to"];
  const relation = raw["relation"];
  if (
    typeof id !== "string" ||
    typeof from !== "string" ||
    typeof to !== "string" ||
    typeof relation !== "string"
  ) {
    throw new Error("seeded edge needs id/from/to/relation");
  }
  const change = Array.isArray(raw["change"])
    ? raw["change"].filter((item): item is string => typeof item === "string")
    : [];
  return {
    id,
    from,
    to,
    relation,
    change,
    incident: [],
    assertions: [{ plane: "intended", status: "asserted" }],
  };
}

function parseCase(raw: unknown): SeededCase {
  if (!isRecord(raw) || typeof raw["id"] !== "string") throw new Error("seeded case id missing");
  const change = raw["change"];
  const gt = raw["ground_truth"];
  const covers = raw["covers"];
  if (!isRecord(change) || !isRecord(gt)) throw new Error(`${raw["id"]} change/ground_truth missing`);
  const paths = Array.isArray(change["paths"])
    ? change["paths"].filter((item): item is string => typeof item === "string")
    : [];
  const labels = Array.isArray(change["labels"])
    ? change["labels"].filter((item): item is string => typeof item === "string")
    : [];
  const affected = Array.isArray(gt["affected_nodes"])
    ? gt["affected_nodes"].filter((item): item is string => typeof item === "string")
    : [];
  const requiredChecks = Array.isArray(gt["required_checks"])
    ? gt["required_checks"].filter((item): item is string => typeof item === "string")
    : [];
  const unknowns = Array.isArray(gt["known_unknowns"])
    ? gt["known_unknowns"].flatMap(parseUnknown)
    : [];
  const relations =
    isRecord(covers) && Array.isArray(covers["relations"])
      ? covers["relations"].filter((item): item is string => typeof item === "string")
      : [];
  return {
    id: raw["id"],
    paths,
    labels,
    affected,
    requiredChecks,
    unknownsExpected: gt["known_unknowns_expected"] === true,
    unknowns,
    authoredBy: typeof raw["authored_by"] === "string" ? raw["authored_by"] : "",
    rationale: typeof raw["rationale"] === "string" ? raw["rationale"] : "",
    relations,
  };
}

function parseUnknown(raw: unknown): SeededUnknown[] {
  if (!isRecord(raw) || typeof raw["kind"] !== "string" || typeof raw["ref"] !== "string") {
    return [];
  }
  return [{ kind: raw["kind"] as ImpactUnknown["kind"], ref: raw["ref"] }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
