/**
 * Pure graph primitives. No I/O, no knowledge of what the nodes mean.
 *
 * Used first by the document DAG linter and again by impact traversal, which
 * walks a different graph under the same rule: a cycle in the data is a defect
 * where order matters, and normal where it does not.
 */

export interface GraphNode {
  readonly id: string;
  readonly dependsOn: readonly string[];
}

/**
 * Every cycle reachable in the dependency graph, each as the path that closes
 * it. Returns an empty array for an acyclic graph.
 *
 * The path is reported in full rather than as a single offending id, because
 * "spec.runner depends on spec.policy depends on spec.runner" is actionable and
 * "there is a cycle somewhere" is not — that was exactly the failure mode when
 * acyclicity was checked by reading.
 */
export function findCycles(nodes: readonly GraphNode[]): string[][] {
  const deps = new Map(nodes.map((n) => [n.id, n.dependsOn]));
  const state = new Map<string, "open" | "done">();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seen = new Set<string>();

  const visit = (id: string): void => {
    const current = state.get(id);
    if (current === "done") return;

    if (current === "open") {
      const from = stack.indexOf(id);
      const cycle = [...stack.slice(from), id];
      // The same cycle is reachable from several entry points; report it once.
      const key = canonicalCycleKey(cycle);
      if (!seen.has(key)) {
        seen.add(key);
        cycles.push(cycle);
      }
      return;
    }

    state.set(id, "open");
    stack.push(id);
    for (const dep of deps.get(id) ?? []) {
      if (deps.has(dep)) visit(dep);
    }
    stack.pop();
    state.set(id, "done");
  };

  for (const node of nodes) visit(node.id);
  return cycles;
}

/** Rotation-independent identity of a cycle, so one cycle is reported once. */
function canonicalCycleKey(cycle: string[]): string {
  const ring = cycle.slice(0, -1);
  if (ring.length === 0) return cycle.join(">");
  let best = 0;
  for (let i = 1; i < ring.length; i++) {
    if (ring[i]! < ring[best]!) best = i;
  }
  return [...ring.slice(best), ...ring.slice(0, best)].join(">");
}

/** Ids referenced in `dependsOn` that no node declares. */
export function findDanglingDependencies(nodes: readonly GraphNode[]): {
  from: string;
  missing: string;
}[] {
  const known = new Set(nodes.map((n) => n.id));
  return nodes.flatMap((n) =>
    n.dependsOn.filter((d) => !known.has(d)).map((missing) => ({ from: n.id, missing })),
  );
}

/** Ids declared by more than one node. */
export function findDuplicateIds(nodes: readonly GraphNode[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.id)) duplicates.add(n.id);
    seen.add(n.id);
  }
  return [...duplicates].sort();
}
