/**
 * S-7: reconcile invariant IDs from the three registries with test names.
 *
 * Deferred IDs stay uncovered and visible. Silent omission would make
 * `glt_structural_coverage` lie in the pleasant direction.
 */

export interface Deferral {
  readonly id: string;
  readonly until: string;
}

export interface CoverageInput {
  readonly registry: readonly string[];
  readonly testIds: readonly string[];
  readonly deferrals: readonly Deferral[];
}

export interface CoverageReport {
  readonly metric: "glt_structural_coverage";
  /** Covered test IDs / registry size. A number, never the word "ok". */
  readonly value: number;
  readonly covered: number;
  readonly total: number;
  readonly uncovered: readonly string[];
  readonly deferred: readonly Deferral[];
  /** Uncovered and not deferred — the blocking set. */
  readonly missingTests: readonly string[];
  readonly unknownDeferrals: readonly string[];
}

export function reconcileCoverage(input: CoverageInput): CoverageReport {
  const registry = uniqueSorted(input.registry);
  const tested = new Set(input.testIds);
  const deferralById = new Map(input.deferrals.map((d) => [d.id, d]));
  const registrySet = new Set(registry);

  const uncovered = registry.filter((id) => !tested.has(id));
  const covered = registry.filter((id) => tested.has(id));
  const deferred = uncovered.flatMap((id) => {
    const row = deferralById.get(id);
    return row === undefined ? [] : [row];
  });
  const missingTests = uncovered.filter((id) => !deferralById.has(id));
  const unknownDeferrals = uniqueSorted(
    input.deferrals.filter((d) => !registrySet.has(d.id)).map((d) => d.id),
  );

  const total = registry.length;
  const value = total === 0 ? 0 : covered.length / total;

  return {
    metric: "glt_structural_coverage",
    value,
    covered: covered.length,
    total,
    uncovered,
    deferred,
    missingTests,
    unknownDeferrals,
  };
}

export function parseRegistryIds(protoMd: string, invMd: string, structuralMd: string): string[] {
  const proto = matches(protoMd, /^\| (PROTO-\d+) \|/gm);
  const inv = matches(invMd, /^## (INV-\d+)\b/gm);
  const structural = matches(structuralMd, /^## (S-\d+) —/gm);
  return [...proto, ...inv, ...structural];
}

export function parseTestIds(source: string): string[] {
  const titles = [
    ...source.matchAll(/(?:it|test|describe)\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g),
  ].map((m) => m[2] ?? "");
  const ids: string[] = [];
  for (const title of titles) {
    for (const hit of title.matchAll(/\b(PROTO-\d+|INV-\d+|S-\d+)\b/g)) {
      if (hit[1] !== undefined) ids.push(hit[1]);
    }
  }
  return uniqueSorted(ids);
}

export function parseDeferrals(structuralMd: string): Deferral[] {
  const heading = "### Отложенные инварианты";
  const start = structuralMd.indexOf(heading);
  if (start < 0) return [];
  const rest = structuralMd.slice(start);
  const next = rest.indexOf("\n## ");
  const section = next < 0 ? rest : rest.slice(0, next);
  return [...section.matchAll(/^\| (PROTO-\d+|INV-\d+|S-\d+) \| (glt\.dev\.\d+) \|/gm)].map(
    (m) => ({ id: m[1] ?? "", until: m[2] ?? "" }),
  );
}

function matches(text: string, re: RegExp): string[] {
  return [...text.matchAll(re)].flatMap((m) => (m[1] === undefined ? [] : [m[1]]));
}

function uniqueSorted(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort();
}
