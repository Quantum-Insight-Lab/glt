/**
 * Impact traversal (DEV-10). Pure: the matrix, snapshot graph and change
 * descriptor arrive already parsed. Filesystem stays in `packages/impact`.
 *
 * Rules are data. A relation with no row is `known_unknowns` of kind
 * `uncovered_relation`, never a silent skip (INV-05). LLM labels never enter
 * `change.labels` or `release` (INV-12). Topology cycles are walked with a
 * visited set; an execution-order cycle is PROTO-07.
 */

import { coverageNotEstablished } from "./coverage-manifest.ts";
import { findCycles } from "./graph.ts";
import { contractInvalid, invariantViolated } from "./errors.ts";

export const CLASSIFIER_VERSION = "1.0.0";

export interface ImpactSource {
  readonly repository: string;
  readonly path: string;
  readonly authority: string;
  readonly role?: string;
}

export interface ImpactNodeView {
  readonly id: string;
  readonly sources: readonly { readonly path: string; readonly repository?: string }[];
}

export interface ImpactEdgeView {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly relation: string;
  readonly change: readonly string[];
  readonly incident: readonly string[];
  readonly assertions: readonly { readonly plane: string; readonly status: string }[];
}

export interface ImpactRuleView {
  readonly id: string;
  readonly mode: "change" | "incident";
  readonly relation: string;
  readonly changed_endpoint: "from" | "to" | "either";
  readonly change_classes?: readonly string[];
  readonly incident_classes?: readonly string[];
  readonly planes?: readonly string[];
  readonly direction: "with_edge" | "against_edge" | "none";
  readonly edge_filter: "propagation.change" | "propagation.incident" | "none";
  readonly effects: readonly string[];
  readonly stop: readonly string[];
}

export interface ImpactMatrixView {
  readonly version: string;
  readonly rules: readonly ImpactRuleView[];
  readonly uncoveredRelations: readonly string[];
}

export interface ImpactUnknown {
  readonly kind:
    | "outside_boundary"
    | "uncovered_relation"
    | "stale_evidence"
    | "unowned_node"
    | "source_conflict"
    | "unmapped_source";
  readonly ref: string;
  readonly detail?: string;
}

export interface ImpactReportView {
  readonly report_id: string;
  readonly snapshot_id: string;
  readonly snapshot_digest: string;
  readonly boundary_id: string;
  readonly mode: "change" | "incident";
  readonly change: {
    readonly classifier_version: string;
    readonly matrix_version: string;
    readonly labels: readonly string[];
    readonly sources: readonly ImpactSource[];
  };
  readonly affected_nodes: readonly string[];
  readonly candidate_paths: readonly string[][];
  readonly required_checks: readonly string[];
  readonly known_unknowns: readonly ImpactUnknown[];
  readonly release?: { readonly gate: string; readonly state: "pending"; readonly reason: string };
  readonly coverage_not_established: boolean;
}

export interface ComputeImpactInput {
  readonly reportId: string;
  readonly snapshotId: string;
  readonly snapshotDigest: string;
  readonly boundaryId: string;
  readonly nodes: readonly ImpactNodeView[];
  readonly edges: readonly ImpactEdgeView[];
  readonly boundaryNodes: readonly string[];
  readonly matrix: ImpactMatrixView;
  readonly sources: readonly ImpactSource[];
  readonly maxDepth: number;
  readonly mode?: "change" | "incident";
  readonly labels?: readonly string[];
  readonly llmLabels?: readonly string[];
  readonly classifierVersion?: string;
}

interface WalkState {
  readonly node: string;
  readonly cls: string;
  readonly depth: number;
  readonly path: readonly string[];
}

/** Deterministic classifier. Path shape, not an LLM. */
export function classifyChange(path: string): string[] {
  const normalized = path.normalize("NFC");
  if (normalized.includes("schemas/") || normalized.endsWith(".schema.json")) return ["schema"];
  if (normalized.includes("docs/SPEC/")) return ["interface"];
  return ["content"];
}

export function computeImpact(input: ComputeImpactInput): ImpactReportView {
  const mode = input.mode ?? "change";
  const classifierVersion = input.classifierVersion ?? CLASSIFIER_VERSION;
  const labels = deterministicLabels(input);
  if (labels.length === 0) {
    throw contractInvalid("impact change labels must not be empty");
  }

  if (input.boundaryNodes.length === 0) {
    throw contractInvalid("coverage manifest nodes are required", [input.boundaryId]);
  }
  const nodeIds = new Set(input.nodes.map((node) => node.id));
  const boundary = new Set(input.boundaryNodes);
  const knownUnknowns: ImpactUnknown[] = [];
  const mapped = new Set<string>();
  for (const source of input.sources) {
    const id = matchSource(input.nodes, source);
    if (id === undefined) {
      knownUnknowns.push({
        kind: "unmapped_source",
        ref: source.path,
        detail: "source path matches no node",
      });
    } else {
      mapped.add(id);
    }
  }

  const affected = new Set<string>(mapped);
  const requiredChecks = new Set<string>();
  const gates = new Set<string>();
  const paths: string[][] = [];
  const visited = new Set<string>();
  const uncoveredSeen = new Set<string>();
  const outsideSeen = new Set<string>();

  const queue: WalkState[] = [];
  for (const id of mapped) {
    for (const cls of labels) {
      queue.push({ node: id, cls, depth: 0, path: [id] });
    }
  }

  while (queue.length > 0) {
    const state = queue.shift();
    if (state === undefined) break;
    const key = `${state.node}\0${state.cls}`;
    if (visited.has(key)) continue;
    visited.add(key);

    for (const edge of input.edges) {
      if (edge.from !== state.node && edge.to !== state.node) continue;
      if (isUncovered(input.matrix, edge.relation)) {
        if (!uncoveredSeen.has(edge.id)) {
          uncoveredSeen.add(edge.id);
          knownUnknowns.push({
            kind: "uncovered_relation",
            ref: edge.id,
            detail: edge.relation,
          });
        }
        continue;
      }

      const rules = matchingRules(input.matrix, edge, state, mode);
      for (const rule of rules) {
        applyEffects(rule, edge, state.node, requiredChecks, gates, knownUnknowns);
        if (rule.direction === "none") continue;
        const next = nextNode(edge, state.node, rule.direction);
        if (next === undefined) continue;
        if (rule.stop.includes("max_depth") && state.depth + 1 > input.maxDepth) continue;
        if (!nodeIds.has(next) || !boundary.has(next)) {
          if (!outsideSeen.has(next)) {
            outsideSeen.add(next);
            knownUnknowns.push({ kind: "outside_boundary", ref: next });
          }
          continue;
        }
        if (rule.effects.includes("mark_affected")) {
          affected.add(next);
          const candidate = [...state.path, next];
          if (candidate.length > 1) paths.push(candidate);
        }
        queue.push({
          node: next,
          cls: state.cls,
          depth: state.depth + 1,
          path: [...state.path, next],
        });
      }
    }
  }

  for (const check of requiredChecks) {
    for (const edge of input.edges) {
      if (edge.relation !== "gates" || edge.to !== check) continue;
      if (isUncovered(input.matrix, edge.relation)) continue;
      gates.add(edge.from);
    }
  }

  const execution = executionOrder(requiredChecks, gates, input.edges);
  const cycles = findCycles(execution);
  if (cycles.length > 0) {
    throw invariantViolated("PROTO-07", "execution graph is cyclic", cycles[0]);
  }

  const coverageGap = coverageNotEstablished(knownUnknowns);

  const report: ImpactReportView = {
    report_id: input.reportId,
    snapshot_id: input.snapshotId,
    snapshot_digest: input.snapshotDigest,
    boundary_id: input.boundaryId,
    mode,
    change: {
      classifier_version: classifierVersion,
      matrix_version: input.matrix.version,
      labels: [...labels],
      sources: input.sources,
    },
    affected_nodes: [...affected].sort(compare),
    candidate_paths: sortPaths(paths),
    required_checks: [...requiredChecks].sort(compare),
    known_unknowns: sortUnknowns(knownUnknowns),
    coverage_not_established: coverageGap,
  };

  const gate = [...gates].sort(compare)[0];
  if (gate !== undefined) {
    return {
      ...report,
      release: { gate, state: "pending", reason: "required_checks_pending" },
    };
  }
  return report;
}

function deterministicLabels(input: ComputeImpactInput): string[] {
  // llmLabels are review-only and never become gate input (INV-12).
  void input.llmLabels;
  if (input.labels !== undefined && input.labels.length > 0) {
    return uniqueSorted(input.labels);
  }
  return uniqueSorted(input.sources.flatMap((source) => classifyChange(source.path)));
}

function matchSource(nodes: readonly ImpactNodeView[], source: ImpactSource): string | undefined {
  const want = source.path.normalize("NFC");
  const hits = nodes.filter((node) =>
    node.sources.some((item) => item.path.normalize("NFC") === want),
  );
  if (hits.length === 1) return hits[0]?.id;
  return undefined;
}

function isUncovered(matrix: ImpactMatrixView, relation: string): boolean {
  if (matrix.uncoveredRelations.includes(relation)) return true;
  return !matrix.rules.some((rule) => rule.relation === relation);
}

function matchingRules(
  matrix: ImpactMatrixView,
  edge: ImpactEdgeView,
  state: WalkState,
  mode: "change" | "incident",
): ImpactRuleView[] {
  return matrix.rules.filter((rule) => {
    if (rule.mode !== mode || rule.relation !== edge.relation) return false;
    if (!endpointMatches(edge, state.node, rule.changed_endpoint)) return false;
    const classes = mode === "change" ? rule.change_classes : rule.incident_classes;
    if (classes !== undefined && !classes.includes(state.cls)) return false;
    if (!planeOk(edge, rule.planes)) return false;
    if (!filterOk(edge, rule.edge_filter, state.cls, mode)) return false;
    return true;
  });
}

function endpointMatches(
  edge: ImpactEdgeView,
  node: string,
  endpoint: ImpactRuleView["changed_endpoint"],
): boolean {
  if (endpoint === "either") return node === edge.from || node === edge.to;
  if (endpoint === "from") return node === edge.from;
  return node === edge.to;
}

function nextNode(
  edge: ImpactEdgeView,
  node: string,
  direction: "with_edge" | "against_edge" | "none",
): string | undefined {
  if (direction === "none") return undefined;
  if (direction === "with_edge") return node === edge.from ? edge.to : undefined;
  return node === edge.to ? edge.from : undefined;
}

function planeOk(edge: ImpactEdgeView, planes: readonly string[] | undefined): boolean {
  if (planes === undefined || planes.length === 0) return true;
  return planes.some((plane) =>
    edge.assertions.some((assertion) => assertion.plane === plane && assertion.status === "asserted"),
  );
}

function filterOk(
  edge: ImpactEdgeView,
  filter: ImpactRuleView["edge_filter"],
  cls: string,
  mode: "change" | "incident",
): boolean {
  if (filter === "none") return true;
  const declared = filter === "propagation.incident" || mode === "incident" ? edge.incident : edge.change;
  return declared.includes(cls);
}

function applyEffects(
  rule: ImpactRuleView,
  edge: ImpactEdgeView,
  current: string,
  requiredChecks: Set<string>,
  gates: Set<string>,
  knownUnknowns: ImpactUnknown[],
): void {
  for (const effect of rule.effects) {
    if (effect === "require_check") requiredChecks.add(edge.from === current ? edge.to : edge.from);
    if (effect === "gate_pending") gates.add(edge.from);
    if (effect === "conflict_check") {
      knownUnknowns.push({ kind: "source_conflict", ref: edge.id, detail: edge.relation });
    }
  }
}

function executionOrder(
  checks: ReadonlySet<string>,
  gates: ReadonlySet<string>,
  edges: readonly ImpactEdgeView[],
): { id: string; dependsOn: readonly string[] }[] {
  const ids = new Set([...checks, ...gates]);
  return [...ids].map((id) => ({
    id,
    dependsOn: edges
      .filter((edge) => edge.relation === "gates" && edge.from === id && ids.has(edge.to))
      .map((edge) => edge.to),
  }));
}

function sortPaths(paths: readonly string[][]): string[][] {
  return [...paths].sort((left, right) => compare(left.join("\0"), right.join("\0")));
}

function sortUnknowns(items: readonly ImpactUnknown[]): ImpactUnknown[] {
  return [...items].sort((left, right) => {
    const kind = compare(left.kind, right.kind);
    return kind !== 0 ? kind : compare(left.ref, right.ref);
  });
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compare);
}

function compare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
