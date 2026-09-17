import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  PACK,
  PACK_ROOT,
  REPO_ROOT,
  bodyLinkTargets,
  createValidator,
  defaultValidatePaths,
  loadDocument,
  loadPackDocs,
  loadYaml,
  validateAgainst,
  type PackDoc,
} from "@glt/contracts";
import {
  findCycles,
  findDanglingDependencies,
  findDuplicateIds,
  factClassesFromMap,
  ownersFromClasses,
} from "@glt/domain";

/**
 * `glt lint docs` — the metadata contract, enforced.
 *
 * Existence, not just structure. A SourceRef validated against its schema
 * proves the shape and says nothing about the target; a reference to a moved
 * file stays schema-valid and keeps looking authoritative, which is worse than
 * one broken by form because it does not give itself away.
 */

export type FindingKind =
  | "frontmatter-missing"
  | "frontmatter-invalid"
  | "field-missing"
  | "id-duplicate"
  | "depends-on-dangling"
  | "depends-on-cycle"
  | "spec-ref-missing"
  | "source-ref-invalid"
  | "source-ref-missing"
  | "link-broken"
  | "normativity-wrong"
  | "owner-unknown";

export interface Finding {
  readonly kind: FindingKind;
  /** Document the finding is about, relative to the pack root. */
  readonly doc: string;
  readonly detail: string;
}

export interface LintReport {
  readonly checked: number;
  readonly cycles: number;
  readonly findings: readonly Finding[];
}

const REQUIRED_FIELDS = [
  "id",
  "owner",
  "normativity",
  "status",
  "depends_on",
  "source_refs",
] as const;

export function lintDocs(): LintReport {
  const docs = loadPackDocs();
  const findings: Finding[] = [];

  const owners = ownersFromClasses(factClassesFromMap(loadYaml(PACK.authorityMap)));

  const ajv = createValidator();
  const parsed: { doc: PackDoc; id: string; dependsOn: string[] }[] = [];

  for (const doc of docs) {
    if (!doc.frontmatter) {
      findings.push({
        kind: doc.parseError?.startsWith("YAML") ? "frontmatter-invalid" : "frontmatter-missing",
        doc: doc.path,
        detail: doc.parseError ?? "frontmatter отсутствует",
      });
      continue;
    }

    const fm = doc.frontmatter;

    for (const field of REQUIRED_FIELDS) {
      if (fm[field] === undefined) {
        findings.push({ kind: "field-missing", doc: doc.path, detail: field });
      }
    }

    if (typeof fm.id === "string") {
      parsed.push({ doc, id: fm.id, dependsOn: fm.depends_on ?? [] });
    }

    // examples/** are reference adopters and never speak for the core
    if (doc.path.startsWith("examples/") && fm.normativity !== "non_normative") {
      findings.push({
        kind: "normativity-wrong",
        doc: doc.path,
        detail: `examples/** обязаны быть non_normative, указано ${String(fm.normativity)}`,
      });
    }

    if (fm.normativity === "normative" && typeof fm.owner === "string" && !owners.has(fm.owner)) {
      findings.push({
        kind: "owner-unknown",
        doc: doc.path,
        detail: `owner "${fm.owner}" отсутствует в authority-map`,
      });
    }

    for (const ref of fm.spec_refs ?? []) {
      if (!existsSync(resolve(dirname(doc.absolutePath), ref))) {
        findings.push({ kind: "spec-ref-missing", doc: doc.path, detail: ref });
      }
    }

    for (const ref of fm.source_refs ?? []) {
      findings.push(...lintSourceRef(ajv, doc.path, ref));
    }

    for (const target of bodyLinkTargets(doc.body)) {
      if (!existsSync(resolve(dirname(doc.absolutePath), target))) {
        findings.push({ kind: "link-broken", doc: doc.path, detail: target });
      }
    }
  }

  for (const id of findDuplicateIds(parsed)) {
    const where = parsed
      .filter((p) => p.id === id)
      .map((p) => p.doc.path)
      .join(", ");
    findings.push({ kind: "id-duplicate", doc: where, detail: id });
  }

  for (const { from, missing } of findDanglingDependencies(parsed)) {
    const doc = parsed.find((p) => p.id === from)?.doc.path ?? from;
    findings.push({ kind: "depends-on-dangling", doc, detail: missing });
  }

  const cycles = findCycles(parsed);
  for (const cycle of cycles) {
    findings.push({
      kind: "depends-on-cycle",
      doc: parsed.find((p) => p.id === cycle[0])?.doc.path ?? cycle[0]!,
      detail: cycle.join(" → "),
    });
  }

  for (const abs of packDataFiles()) {
    const doc = relative(PACK_ROOT, abs).replaceAll("\\", "/");
    for (const ref of collectSourceRefShapes(loadDocument(abs))) {
      findings.push(...lintSourceRef(ajv, doc, ref));
    }
  }

  return { checked: docs.length, cycles: cycles.length, findings };
}

/** Same checker for frontmatter `source_refs` and SourceRef objects inside pack data. */
export function lintSourceRef(
  ajv: ReturnType<typeof createValidator>,
  doc: string,
  ref: unknown,
): Finding[] {
  const problems = validateAgainst(ajv, "source-ref", ref);
  if (problems.length > 0) {
    return [
      {
        kind: "source-ref-invalid",
        doc,
        detail: `${JSON.stringify(ref)} → ${problems.map((p) => `${p.path} ${p.message}`).join("; ")}`,
      },
    ];
  }
  const { repository, path } = ref as { repository: string; path: string };
  if (repository === "glt-controlplane" && !existsSync(join(REPO_ROOT, path))) {
    return [{ kind: "source-ref-missing", doc, detail: path }];
  }
  return [];
}

/** Walk a parsed bundle, golden or other pack artifact for SourceRef-shaped objects. */
export function collectSourceRefShapes(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(collectSourceRefShapes);
  if (value === null || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (
    typeof record.repository === "string" &&
    typeof record.path === "string" &&
    typeof record.authority === "string"
  ) {
    return [record];
  }
  return Object.values(record).flatMap(collectSourceRefShapes);
}

function packDataFiles(): string[] {
  const seen = new Set<string>();
  const files: string[] = [];
  for (const abs of [PACK.intendedComponents, ...defaultValidatePaths()]) {
    if (seen.has(abs)) continue;
    seen.add(abs);
    files.push(abs);
  }
  return files;
}

export function renderLintReport(report: LintReport): string {
  if (report.findings.length === 0) {
    return `проверено документов: ${report.checked}, циклов: 0, замечаний нет`;
  }
  const lines = report.findings.map((f) => `  ${f.kind}  ${f.doc}: ${f.detail}`);
  return [
    `проверено документов: ${report.checked}`,
    `замечаний: ${report.findings.length}`,
    ...lines,
  ].join("\n");
}
