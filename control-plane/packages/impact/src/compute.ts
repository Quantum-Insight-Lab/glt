/**
 * Impact engine I/O (DEV-10). Loads the matrix, snapshot and parameter card,
 * then traverses in domain. The artifact goes to stdout; v1 never writes the
 * workspace (cli.md).
 *
 * Contract: glt-specpack/docs/SPEC/impact.md
 */

import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  PACK,
  PACK_ROOT,
  createValidator,
  loadDocument,
  loadJson,
  loadParameterCards,
  validateAgainst,
} from "@glt/contracts";
import {
  CLASSIFIER_VERSION,
  computeImpact,
  contractInvalid,
  parameterSpecFromCard,
  parameterValue,
  usageError,
  type CompiledSnapshot,
  type ComputeImpactInput,
  type ImpactEdgeView,
  type ImpactMatrixView,
  type ImpactNodeView,
  type ImpactReportView,
  type ImpactRuleView,
  type ImpactSource,
  type SnapshotPin,
} from "@glt/domain";
import { loadCoverageManifest } from "@glt/registry";
import { compileSnapshotFromPaths } from "@glt/snapshot";

const DEPTH_PARAM = "glt.param.impact.max_traversal_depth";
const GOLDEN_SNAPSHOT_ID = "snap-bootstrap-golden-001";
const GOLDEN_REPORT_ID = "imp-bootstrap-001";

const BOOTSTRAP_CHANGE: ImpactSource = {
  repository: "glt-controlplane",
  path: "glt-specpack/docs/SPEC/registry.md",
  authority: "glt-id-registry",
  role: "changed",
};

export interface ComputeImpactFromPathsOptions {
  readonly registry?: string;
  readonly boundary?: string;
  readonly matrix?: string;
  readonly snapshot?: string;
  readonly asOf?: string;
  readonly pinnedTo?: SnapshotPin;
  readonly snapshotId?: string;
  readonly maxDepth?: number;
  readonly sources?: readonly ImpactSource[];
  readonly labels?: readonly string[];
  readonly llmLabels?: readonly string[];
  readonly reportId?: string;
  readonly mode?: "change" | "incident";
}

export function loadPropagationMatrix(path?: string): ImpactMatrixView {
  const matrixPath = resolveMatrixPath(path);
  const matrixDoc = loadDocument(matrixPath);
  const matrixErrors = validateAgainst(createValidator(), "propagation-matrix", matrixDoc);
  if (matrixErrors.length > 0) {
    throw contractInvalid(
      matrixErrors.map((e) => `${e.path} ${e.message}`).join("; "),
      [matrixPath],
    );
  }
  return matrixView(matrixDoc);
}

export function impactMaxTraversalDepth(override?: number): number {
  return parameterValue(depthSpec(), override);
}

export function impactGraphFromSnapshot(snapshot: CompiledSnapshot): {
  readonly nodes: ImpactNodeView[];
  readonly edges: ImpactEdgeView[];
} {
  return { nodes: nodeViews(snapshot), edges: edgeViews(snapshot) };
}

export function computeImpactFromPaths(
  options: ComputeImpactFromPathsOptions = {},
): ImpactReportView {
  const matrix = loadPropagationMatrix(options.matrix);
  const snapshot = loadOrCompileSnapshot(options);
  const graph = impactGraphFromSnapshot(snapshot);
  const sources = options.sources ?? [BOOTSTRAP_CHANGE];
  const maxDepth = impactMaxTraversalDepth(options.maxDepth);
  const input: ComputeImpactInput = {
    reportId: options.reportId ?? reportIdFor(snapshot.snapshot_id),
    snapshotId: snapshot.snapshot_id,
    snapshotDigest: snapshot.digest,
    boundaryId: snapshot.boundary_id,
    nodes: graph.nodes,
    edges: graph.edges,
    boundaryNodes: loadCoverageManifest(options.boundary ?? snapshot.boundary_id).nodes,
    matrix,
    sources,
    maxDepth,
    classifierVersion: CLASSIFIER_VERSION,
    ...(options.mode !== undefined ? { mode: options.mode } : {}),
    ...(options.labels !== undefined ? { labels: options.labels } : {}),
    ...(options.llmLabels !== undefined ? { llmLabels: options.llmLabels } : {}),
  };
  const report = computeImpact(input);
  const problems = validateAgainst(createValidator(), "impact-report", report);
  if (problems.length > 0) {
    throw contractInvalid(
      problems.map((e) => `${e.path} ${e.message}`).join("; "),
      [report.report_id],
    );
  }
  return report;
}

export function renderImpactReport(report: ImpactReportView): string {
  const unknowns = String(report.known_unknowns.length);
  const checks = String(report.required_checks.length);
  return [
    `impact ${report.report_id} ${report.snapshot_digest}`,
    `boundary ${report.boundary_id} nodes ${String(report.affected_nodes.length)} checks ${checks} unknowns ${unknowns}`,
  ].join("\n");
}

function loadOrCompileSnapshot(options: ComputeImpactFromPathsOptions): CompiledSnapshot {
  if (options.snapshot !== undefined && options.snapshot.length > 0) {
    const path = resolveSnapshotPath(options.snapshot);
    const doc = loadJson<CompiledSnapshot>(path);
    if (doc.kind !== "TopologySnapshot") {
      throw contractInvalid("impact --snapshot must be a TopologySnapshot", [path]);
    }
    if (typeof doc.digest !== "string" || doc.digest.length === 0) {
      throw contractInvalid("snapshot digest missing", [path]);
    }
    return doc;
  }
  return compileSnapshotFromPaths({
    ...(options.registry !== undefined ? { registry: options.registry } : {}),
    ...(options.boundary !== undefined ? { boundary: options.boundary } : {}),
    ...(options.matrix !== undefined ? { matrix: options.matrix } : {}),
    ...(options.asOf !== undefined ? { asOf: options.asOf } : {}),
    ...(options.pinnedTo !== undefined ? { pinnedTo: options.pinnedTo } : {}),
    ...(options.snapshotId !== undefined ? { snapshotId: options.snapshotId } : {}),
  });
}

function reportIdFor(snapshotId: string): string {
  return snapshotId === GOLDEN_SNAPSHOT_ID ? GOLDEN_REPORT_ID : `imp-${snapshotId}`;
}

function depthSpec() {
  for (const card of loadParameterCards()) {
    const spec = parameterSpecFromCard(card);
    if (spec.id === DEPTH_PARAM) return spec;
  }
  throw contractInvalid("parameter card missing", [DEPTH_PARAM]);
}

function resolveMatrixPath(flag: string | undefined): string {
  if (flag === undefined || flag.length === 0) return PACK.propagationMatrix;
  if (isAbsolute(flag)) return flag;
  const fromCwd = resolve(flag);
  if (existsSync(fromCwd)) return fromCwd;
  return resolve(PACK_ROOT, flag);
}

function resolveSnapshotPath(flag: string): string {
  if (isAbsolute(flag)) {
    if (!existsSync(flag)) throw usageError("snapshot not found", [flag]);
    return flag;
  }
  const fromCwd = resolve(flag);
  if (existsSync(fromCwd)) return fromCwd;
  const fromPack = resolve(PACK_ROOT, flag);
  if (existsSync(fromPack)) return fromPack;
  throw usageError("snapshot not found", [flag]);
}

function matrixView(doc: unknown): ImpactMatrixView {
  if (!isRecord(doc) || !isRecord(doc["metadata"]) || !isRecord(doc["spec"])) {
    throw contractInvalid("propagation matrix is not an object");
  }
  const version = doc["metadata"]["matrix_version"];
  if (typeof version !== "string" || version.length === 0) {
    throw contractInvalid("propagation matrix metadata.matrix_version missing");
  }
  const spec = doc["spec"];
  const rulesRaw = spec["rules"];
  const uncoveredRaw = spec["uncovered_relations"];
  if (!Array.isArray(rulesRaw) || !Array.isArray(uncoveredRaw)) {
    throw contractInvalid("propagation matrix spec.rules/uncovered_relations missing");
  }
  return {
    version,
    rules: rulesRaw.map(ruleView),
    uncoveredRelations: uncoveredRaw.filter((item): item is string => typeof item === "string"),
  };
}

function ruleView(raw: unknown): ImpactRuleView {
  if (!isRecord(raw)) throw contractInvalid("propagation rule is not an object");
  const mode = raw["mode"];
  const endpoint = raw["changed_endpoint"];
  const direction = raw["direction"];
  const filter = raw["edge_filter"];
  if (mode !== "change" && mode !== "incident") {
    throw contractInvalid("propagation rule mode invalid");
  }
  if (endpoint !== "from" && endpoint !== "to" && endpoint !== "either") {
    throw contractInvalid("propagation rule changed_endpoint invalid");
  }
  if (direction !== "with_edge" && direction !== "against_edge" && direction !== "none") {
    throw contractInvalid("propagation rule direction invalid");
  }
  if (filter !== "propagation.change" && filter !== "propagation.incident" && filter !== "none") {
    throw contractInvalid("propagation rule edge_filter invalid");
  }
  return {
    id: asString(raw["id"], "rule.id"),
    mode,
    relation: asString(raw["relation"], "rule.relation"),
    changed_endpoint: endpoint,
    direction,
    edge_filter: filter,
    effects: asStringArray(raw["effects"]),
    stop: asStringArray(raw["stop"]),
    ...(Array.isArray(raw["change_classes"])
      ? { change_classes: asStringArray(raw["change_classes"]) }
      : {}),
    ...(Array.isArray(raw["incident_classes"])
      ? { incident_classes: asStringArray(raw["incident_classes"]) }
      : {}),
    ...(Array.isArray(raw["planes"]) ? { planes: asStringArray(raw["planes"]) } : {}),
  };
}

function nodeViews(snapshot: CompiledSnapshot): ImpactNodeView[] {
  return snapshot.nodes.flatMap((raw) => {
    if (!isRecord(raw) || !isRecord(raw["metadata"]) || !isRecord(raw["spec"])) return [];
    const id = raw["metadata"]["id"];
    if (typeof id !== "string" || id.length === 0) return [];
    const sourcesRaw = raw["spec"]["sources"];
    const sources = Array.isArray(sourcesRaw)
      ? sourcesRaw.flatMap((item) => {
          if (!isRecord(item) || typeof item["path"] !== "string") return [];
          return [
            {
              path: item["path"],
              ...(typeof item["repository"] === "string" ? { repository: item["repository"] } : {}),
            },
          ];
        })
      : [];
    return [{ id, sources }];
  });
}

function edgeViews(snapshot: CompiledSnapshot): ImpactEdgeView[] {
  return snapshot.edges.flatMap((raw) => {
    if (!isRecord(raw) || !isRecord(raw["metadata"]) || !isRecord(raw["spec"])) return [];
    const id = raw["metadata"]["id"];
    const spec = raw["spec"];
    if (typeof id !== "string" || id.length === 0) return [];
    const assertionsRaw = spec["assertions"];
    const propagation = isRecord(spec["propagation"]) ? spec["propagation"] : {};
    return [
      {
        id,
        from: asString(spec["from"], "edge.from"),
        to: asString(spec["to"], "edge.to"),
        relation: asString(spec["relation"], "edge.relation"),
        change: asStringArray(propagation["change"]),
        incident: asStringArray(propagation["incident"]),
        assertions: Array.isArray(assertionsRaw)
          ? assertionsRaw.flatMap((item) => {
              if (!isRecord(item) || typeof item["plane"] !== "string") return [];
              return [
                {
                  plane: item["plane"],
                  status: typeof item["status"] === "string" ? item["status"] : "",
                },
              ];
            })
          : [],
      },
    ];
  });
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw contractInvalid(`${field} must be a non-empty string`);
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
