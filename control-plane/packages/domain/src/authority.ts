/**
 * INV-01 and provenance: one owner per fact class; a path claimed by two
 * classes with different owners is a source_conflict. The checker never picks
 * a winner — that would be a second source of truth.
 */

export interface FactClass {
  readonly id: string;
  readonly owner: string;
  readonly authoritativePaths: readonly string[];
}

export interface NormativeDocOwner {
  readonly path: string;
  readonly owner: string;
}

export type AuthorityFindingKind =
  | "duplicate-class-id"
  | "duplicate-class-owner"
  | "owner-unknown"
  | "path-claimed-twice";

export interface AuthorityFinding {
  readonly kind: AuthorityFindingKind;
  readonly conflict: "source_conflict";
  readonly invariant: "INV-01" | undefined;
  readonly refs: readonly string[];
  readonly detail: string;
}

export interface AuthorityReport {
  readonly conflict: "none" | "source_conflict";
  /** Policy from the map: same-class conflict blocks everything above read. */
  readonly actions_above: "read";
  readonly blocked: boolean;
  readonly classes: number;
  readonly findings: readonly AuthorityFinding[];
}

export function ownersFromClasses(classes: readonly FactClass[]): ReadonlySet<string> {
  return new Set(classes.map((c) => c.owner).filter((owner) => owner.length > 0));
}

export function enforceAuthorityMap(input: {
  readonly classes: readonly FactClass[];
  readonly normativeDocs: readonly NormativeDocOwner[];
}): AuthorityReport {
  const findings: AuthorityFinding[] = [];
  const byId = new Map<string, FactClass[]>();

  for (const cls of input.classes) {
    const group = byId.get(cls.id) ?? [];
    group.push(cls);
    byId.set(cls.id, group);
  }

  for (const [id, group] of byId) {
    if (group.length > 1) {
      const owners = unique(group.map((c) => c.owner));
      findings.push({
        kind: owners.length > 1 ? "duplicate-class-owner" : "duplicate-class-id",
        conflict: "source_conflict",
        invariant: "INV-01",
        refs: [id, ...owners],
        detail:
          owners.length > 1
            ? `fact class ${id} has owners ${owners.join(", ")}`
            : `fact class ${id} is declared more than once`,
      });
      continue;
    }
    const only = group[0];
    if (only !== undefined && only.owner.length === 0) {
      findings.push({
        kind: "duplicate-class-owner",
        conflict: "source_conflict",
        invariant: "INV-01",
        refs: [id],
        detail: `fact class ${id} has no owner`,
      });
    }
  }

  const uniqueClasses = [...byId.values()].map((group) => group[0]!).filter((c) => c.id.length > 0);
  const pathIndex = new Map<string, FactClass[]>();
  for (const cls of uniqueClasses) {
    for (const raw of cls.authoritativePaths) {
      const path = normalizePath(raw);
      const holders = pathIndex.get(path) ?? [];
      holders.push(cls);
      pathIndex.set(path, holders);
    }
  }

  for (const [path, holders] of pathIndex) {
    const distinct = uniqueById(holders);
    if (distinct.length < 2) continue;
    const owners = unique(distinct.map((c) => c.owner));
    // Same owner, same files: glyph aliases live in registry/ next to ids.
    // Different owners on one path is two authorities, not a specialization.
    if (owners.length < 2) continue;
    findings.push({
      kind: "path-claimed-twice",
      conflict: "source_conflict",
      invariant: "INV-01",
      refs: [path, ...distinct.map((c) => c.id)],
      detail: `path ${path} claimed by ${distinct.map((c) => `${c.id} (${c.owner})`).join(", ")}`,
    });
  }

  const knownOwners = ownersFromClasses(uniqueClasses);
  for (const doc of input.normativeDocs) {
    if (!knownOwners.has(doc.owner)) {
      findings.push({
        kind: "owner-unknown",
        conflict: "source_conflict",
        invariant: "INV-01",
        refs: [doc.path, doc.owner],
        detail: `owner "${doc.owner}" is not in the authority map`,
      });
    }
  }

  const blocked = findings.length > 0;
  return {
    conflict: blocked ? "source_conflict" : "none",
    actions_above: "read",
    blocked,
    classes: uniqueClasses.length,
    findings,
  };
}

export function factClassesFromMap(doc: unknown): FactClass[] {
  if (!isRecord(doc)) return [];
  const spec = doc["spec"];
  if (!isRecord(spec) || !Array.isArray(spec["fact_classes"])) return [];
  return spec["fact_classes"].flatMap((entry) => {
    if (!isRecord(entry) || typeof entry["id"] !== "string") return [];
    const id = entry["id"];
    const owner = entry["owner"];
    const paths = entry["authoritative_paths"];
    const owners =
      typeof owner === "string"
        ? [owner]
        : Array.isArray(owner)
          ? owner.filter((value): value is string => typeof value === "string")
          : [""];
    const authoritativePaths = Array.isArray(paths)
      ? paths.filter((p): p is string => typeof p === "string")
      : [];
    return owners.map((item) => ({
      id,
      owner: item,
      authoritativePaths,
    }));
  });
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function uniqueById(classes: readonly FactClass[]): FactClass[] {
  const seen = new Set<string>();
  const out: FactClass[] = [];
  for (const cls of classes) {
    if (seen.has(cls.id)) continue;
    seen.add(cls.id);
    out.push(cls);
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
