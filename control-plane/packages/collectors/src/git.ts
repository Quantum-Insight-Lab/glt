/**
 * Git collector I/O (DEV-13). Reads a pinned commit and records materialized
 * facts. It does not decide release, checks, health or gates.
 *
 * Digest is `digestOfUtf8` from domain. YAML of in-memory git blobs goes
 * through `parseYamlText` in contracts. The collector is not a `glt` command.
 *
 * Contract: glt-specpack/docs/SPEC/collectors.md
 */

import { execFileSync } from "node:child_process";
import {
  REPO_ROOT,
  loadParameterCards,
  normalizeText,
  parseYamlText,
} from "@glt/contracts";
import {
  ExitCode,
  GltError,
  contractInvalid,
  digestOfUtf8,
  parameterSpecFromCard,
  parameterValue,
  type ExitCode as GltExitCode,
} from "@glt/domain";
import { MATERIALIZED_PLANE, requireMaterializedPlane } from "./plane.ts";

export { MATERIALIZED_PLANE, reportHasPolicyFields, requireMaterializedPlane } from "./plane.ts";

export const STEP = "glt.dev.13" as const;
export const COLLECTOR_ID = "glt.collector.git@1" as const;
export const COLLECTOR_VERSION = "1.0.0" as const;

const TTL_PARAM = "glt.param.collector.git.freshness_ttl_seconds";
const WORKSPACE_FILE = "pnpm-workspace.yaml";
const OWNERSHIP_PATHS = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"] as const;

export type GitCoverage = "established" | "partial" | "unknown";

export interface GitUnknown {
  readonly kind:
    | "missing_commit"
    | "missing_git"
    | "missing_repository_url"
    | "missing_workspace"
    | "missing_ownership"
    | "malformed_manifest";
  readonly ref: string;
}

export interface ModuleNode {
  readonly id: string;
  readonly name: string;
  readonly plane: typeof MATERIALIZED_PLANE;
}

export interface ModuleEdge {
  readonly from: string;
  readonly to: string;
  readonly relation: "depends_on";
  readonly plane: typeof MATERIALIZED_PLANE;
}

export interface OwnershipHint {
  readonly pattern: string;
  readonly owners: readonly string[];
  readonly plane: typeof MATERIALIZED_PLANE;
}

export interface GitCollectorReport {
  readonly collector_id: typeof COLLECTOR_ID;
  readonly collector_version: typeof COLLECTOR_VERSION;
  readonly plane: typeof MATERIALIZED_PLANE;
  readonly repository_url: string | null;
  readonly commit: string | null;
  readonly coverage: GitCoverage;
  readonly known_unknowns: readonly GitUnknown[];
  readonly source_digests: Readonly<Record<string, string>>;
  readonly module_graph: {
    readonly nodes: readonly ModuleNode[];
    readonly edges: readonly ModuleEdge[];
  };
  readonly file_ownership_hints: readonly OwnershipHint[] | null;
  readonly freshness_ttl_seconds: number;
}

export interface GitTree {
  readonly revParse: (commit: string) => string | undefined;
  readonly show: (commit: string, path: string) => string | undefined;
  readonly lsFiles: (commit: string) => readonly string[];
  readonly remoteUrl: () => string | undefined;
}

export interface CollectGitFactsInput {
  readonly commit?: string;
  readonly repositoryUrl?: string;
  readonly plane?: string;
  readonly git: GitTree;
  readonly freshnessTtlSeconds: number;
}

export function gitCollectorFreshnessTtl(override?: number): number {
  return parameterValue(ttlSpec(), override);
}

export function collectGitFromRepo(options: {
  readonly repoRoot?: string;
  readonly commit?: string;
  readonly repositoryUrl?: string;
}): GitCollectorReport {
  return collectGitFacts({
    git: realGit(options.repoRoot ?? REPO_ROOT),
    freshnessTtlSeconds: gitCollectorFreshnessTtl(),
    ...(options.commit !== undefined ? { commit: options.commit } : {}),
    ...(options.repositoryUrl !== undefined ? { repositoryUrl: options.repositoryUrl } : {}),
  });
}

export function collectGitFacts(input: CollectGitFactsInput): GitCollectorReport {
  if (input.plane !== undefined) requireMaterializedPlane(input.plane);

  const unknowns: GitUnknown[] = [];
  const commitRaw = input.commit?.trim() ?? "";
  if (commitRaw.length === 0) {
    return unknownReport(input.freshnessTtlSeconds, input.repositoryUrl, null, [
      { kind: "missing_commit", ref: "commit" },
    ]);
  }

  const sha = input.git.revParse(commitRaw);
  if (sha === undefined) {
    return unknownReport(input.freshnessTtlSeconds, input.repositoryUrl, commitRaw, [
      { kind: "missing_git", ref: commitRaw },
    ]);
  }

  const repositoryUrl = input.repositoryUrl?.trim() || input.git.remoteUrl()?.trim() || "";
  if (repositoryUrl.length === 0) {
    unknowns.push({ kind: "missing_repository_url", ref: "repository_url" });
  }

  const files = input.git.lsFiles(sha);
  const workspaceText = input.git.show(sha, WORKSPACE_FILE);
  const sourceDigests: Record<string, string> = {};
  let nodes: ModuleNode[] = [];
  let edges: ModuleEdge[] = [];

  if (workspaceText === undefined) {
    unknowns.push({ kind: "missing_workspace", ref: WORKSPACE_FILE });
  } else {
    sourceDigests[WORKSPACE_FILE] = digestOfUtf8(normalizeText(workspaceText));
    const packagePaths = workspacePackageJsonPaths(workspaceText, files);
    const packages: { path: string; name: string; deps: readonly string[] }[] = [];
    for (const path of packagePaths) {
      const text = input.git.show(sha, path);
      if (text === undefined) continue;
      sourceDigests[path] = digestOfUtf8(normalizeText(text));
      const parsed = parsePackageManifest(text);
      if (parsed === undefined) {
        unknowns.push({ kind: "malformed_manifest", ref: path });
        continue;
      }
      packages.push({ path: dirnamePosix(path), name: parsed.name, deps: parsed.deps });
    }
    const byName = new Map(packages.map((pkg) => [pkg.name, pkg.path]));
    nodes = packages
      .map((pkg) => ({ id: pkg.path, name: pkg.name, plane: MATERIALIZED_PLANE }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    edges = packages
      .flatMap((pkg) =>
        pkg.deps.flatMap((dep) => {
          const to = byName.get(dep);
          if (to === undefined) return [];
          return [{ from: pkg.path, to, relation: "depends_on" as const, plane: MATERIALIZED_PLANE }];
        }),
      )
      .sort((a, b) => {
        const left = `${a.from}\t${a.to}`;
        const right = `${b.from}\t${b.to}`;
        return left < right ? -1 : left > right ? 1 : 0;
      });
  }

  const ownershipPath = OWNERSHIP_PATHS.find((path) => files.includes(path));
  let hints: OwnershipHint[] | null = null;
  if (ownershipPath === undefined) {
    unknowns.push({ kind: "missing_ownership", ref: "CODEOWNERS" });
  } else {
    const text = input.git.show(sha, ownershipPath);
    if (text === undefined) {
      unknowns.push({ kind: "missing_ownership", ref: ownershipPath });
    } else {
      sourceDigests[ownershipPath] = digestOfUtf8(normalizeText(text));
      hints = parseCodeowners(text);
    }
  }

  const coverage = coverageOf({
    repositoryUrl,
    hasWorkspace: workspaceText !== undefined && nodes.length > 0,
    hasOwnership: hints !== null,
    unknowns,
  });

  return {
    collector_id: COLLECTOR_ID,
    collector_version: COLLECTOR_VERSION,
    plane: MATERIALIZED_PLANE,
    repository_url: repositoryUrl.length > 0 ? repositoryUrl : null,
    commit: sha,
    coverage,
    known_unknowns: unknowns,
    source_digests: sortedRecord(sourceDigests),
    module_graph: { nodes, edges },
    file_ownership_hints: hints,
    freshness_ttl_seconds: input.freshnessTtlSeconds,
  };
}

export function gitFactsExit(report: GitCollectorReport): GltExitCode {
  return report.coverage === "unknown" ? ExitCode.EvidenceInsufficient : ExitCode.Success;
}

export function renderGitCollectorReport(report: GitCollectorReport): string {
  return JSON.stringify(report, null, 2);
}

export function runGitCollector(
  argv: readonly string[],
  env: { readonly repoRoot?: string } = {},
): { code: number; stdout: string; stderr: string } {
  try {
    const repositoryUrl = flag(argv, "--repository-url");
    const report = collectGitFromRepo({
      repoRoot: env.repoRoot ?? REPO_ROOT,
      commit: flag(argv, "--commit") ?? "HEAD",
      ...(repositoryUrl !== undefined ? { repositoryUrl } : {}),
    });
    const code = gitFactsExit(report);
    if (code === ExitCode.Success) {
      return { code, stdout: renderGitCollectorReport(report) + "\n", stderr: "" };
    }
    return {
      code,
      stdout: "",
      stderr: JSON.stringify({
        code,
        invariant: "PROTO-12",
        message: "git collector could not establish facts",
        refs: report.known_unknowns.map((item) => item.ref),
      }) + "\n",
    };
  } catch (error) {
    if (error instanceof GltError) {
      return { code: error.code, stdout: "", stderr: JSON.stringify(error.toJSON()) + "\n" };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { code: ExitCode.Internal, stdout: "", stderr: JSON.stringify({ code: 70, message }) + "\n" };
  }
}

function realGit(repoRoot: string): GitTree {
  return {
    revParse: (commit) => gitText(repoRoot, ["rev-parse", "--verify", `${commit}^{commit}`]),
    show: (commit, path) => gitText(repoRoot, ["show", `${commit}:${path}`]),
    lsFiles: (commit) => {
      const text = gitText(repoRoot, ["ls-tree", "-r", "--name-only", commit]);
      if (text === undefined) return [];
      return text.split("\n").filter((path) => path.length > 0);
    },
    remoteUrl: () => gitText(repoRoot, ["config", "--get", "remote.origin.url"]),
  };
}

function unknownReport(
  ttl: number,
  repositoryUrl: string | undefined,
  commit: string | null,
  unknowns: readonly GitUnknown[],
): GitCollectorReport {
  const url = repositoryUrl?.trim() ?? "";
  return {
    collector_id: COLLECTOR_ID,
    collector_version: COLLECTOR_VERSION,
    plane: MATERIALIZED_PLANE,
    repository_url: url.length > 0 ? url : null,
    commit,
    coverage: "unknown",
    known_unknowns: [...unknowns],
    source_digests: {},
    module_graph: { nodes: [], edges: [] },
    file_ownership_hints: null,
    freshness_ttl_seconds: ttl,
  };
}

function coverageOf(input: {
  readonly repositoryUrl: string;
  readonly hasWorkspace: boolean;
  readonly hasOwnership: boolean;
  readonly unknowns: readonly GitUnknown[];
}): GitCoverage {
  if (!input.hasWorkspace) return "unknown";
  if (input.unknowns.length === 0 && input.repositoryUrl.length > 0 && input.hasOwnership) {
    return "established";
  }
  return "partial";
}

function workspacePackageJsonPaths(workspaceText: string, files: readonly string[]): string[] {
  const globs = workspaceGlobs(workspaceText);
  const matches = new Set<string>();
  for (const glob of globs) {
    for (const path of files) {
      if (isPackageJsonUnderGlob(glob, path)) matches.add(path);
    }
  }
  return [...matches].sort();
}

function workspaceGlobs(workspaceText: string): string[] {
  const doc = parseYamlText<unknown>(workspaceText);
  if (!isRecord(doc) || !Array.isArray(doc["packages"])) return [];
  return doc["packages"].filter((item): item is string => typeof item === "string");
}

function isPackageJsonUnderGlob(glob: string, path: string): boolean {
  const posix = glob.replaceAll("\\", "/").replace(/\/$/, "");
  if (posix.endsWith("/*")) {
    const prefix = posix.slice(0, -1);
    return new RegExp(`^${escapeRegex(prefix)}[^/]+/package\\.json$`).test(path);
  }
  const expected = posix.endsWith("package.json") ? posix : `${posix}/package.json`;
  return path === expected;
}

function parsePackageManifest(text: string): { name: string; deps: readonly string[] } | undefined {
  try {
    const doc = JSON.parse(normalizeText(text)) as unknown;
    if (!isRecord(doc) || typeof doc["name"] !== "string" || doc["name"].length === 0) return undefined;
    const deps = ["dependencies", "devDependencies", "optionalDependencies"].flatMap((field) => {
      const block = doc[field];
      if (!isRecord(block)) return [];
      return Object.entries(block).flatMap(([name, spec]) =>
        typeof spec === "string" && spec.startsWith("workspace:") ? [name] : [],
      );
    });
    return { name: doc["name"], deps };
  } catch {
    return undefined;
  }
}

function parseCodeowners(text: string): OwnershipHint[] {
  return normalizeText(text)
    .split("\n")
    .flatMap((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#")) return [];
      const parts = trimmed.split(/\s+/);
      const pattern = parts[0];
      const owners = parts.slice(1);
      if (pattern === undefined || owners.length === 0) return [];
      return [{ pattern, owners, plane: MATERIALIZED_PLANE }];
    });
}

function ttlSpec() {
  for (const card of loadParameterCards()) {
    const spec = parameterSpecFromCard(card);
    if (spec.id === TTL_PARAM) return spec;
  }
  throw contractInvalid("parameter card missing", [TTL_PARAM]);
}

function gitText(repoRoot: string, args: readonly string[]): string | undefined {
  try {
    return execFileSync("git", [...args], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return undefined;
  }
}

function flag(argv: readonly string[], name: string): string | undefined {
  const i = argv.findIndex((item) => item === name);
  const value = i >= 0 ? argv[i + 1] : undefined;
  return typeof value === "string" && value.length > 0 && !value.startsWith("-") ? value : undefined;
}

function dirnamePosix(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? path : path.slice(0, i);
}

function sortedRecord(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
