/**
 * CI attestations collector I/O (DEV-14). Reads a pinned commit plus a CI
 * report document. It records check conclusions and digests. It does not
 * decide release, gates or health.
 *
 * Stale vs current uses `snapshotIsStale` from domain (S-4, PROTO-11).
 * The collector is not a `glt` command.
 *
 * Contract: glt-specpack/docs/SPEC/collectors.md
 */

import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  REPO_ROOT,
  loadDocument,
  loadParameterCards,
} from "@glt/contracts";
import {
  ExitCode,
  GltError,
  contractInvalid,
  digestOf,
  parameterSpecFromCard,
  parameterValue,
  snapshotIsStale,
  type ExitCode as GltExitCode,
} from "@glt/domain";
import { MATERIALIZED_PLANE, requireMaterializedPlane } from "./plane.ts";

export const CI_STEP = "glt.dev.14" as const;
export const CI_COLLECTOR_ID = "glt.collector.ci@1" as const;
export const CI_COLLECTOR_VERSION = "1.0.0" as const;

const TTL_PARAM = "glt.param.collector.ci.freshness_ttl_seconds";

export type CiCoverage = "established" | "partial" | "unknown";
export type CiFreshness = "current" | "stale" | "unknown";

export interface CiUnknown {
  readonly kind:
    | "missing_commit"
    | "missing_report"
    | "missing_produced_at"
    | "missing_checks"
    | "malformed_check"
    | "malformed_report";
  readonly ref: string;
}

export interface CiCheckFact {
  readonly name: string;
  readonly conclusion: string;
  readonly plane: typeof MATERIALIZED_PLANE;
}

export interface CiAttestationFact {
  readonly kind: string;
  readonly digest: string;
  readonly plane: typeof MATERIALIZED_PLANE;
}

export interface CiCollectorReport {
  readonly collector_id: typeof CI_COLLECTOR_ID;
  readonly collector_version: typeof CI_COLLECTOR_VERSION;
  readonly plane: typeof MATERIALIZED_PLANE;
  readonly commit: string | null;
  readonly coverage: CiCoverage;
  readonly freshness: CiFreshness;
  readonly known_unknowns: readonly CiUnknown[];
  readonly checks: readonly CiCheckFact[];
  readonly current_checks: readonly CiCheckFact[];
  readonly attestations: readonly CiAttestationFact[];
  readonly freshness_ttl_seconds: number;
  readonly age_seconds: number | null;
}

export interface CollectCiFactsInput {
  readonly commit?: string;
  readonly producedAt?: string;
  readonly asOf: string;
  readonly checks?: unknown;
  readonly attestations?: unknown;
  readonly plane?: string;
  readonly freshnessTtlSeconds: number;
  readonly unknowns?: readonly CiUnknown[];
}

export function ciCollectorFreshnessTtl(override?: number): number {
  return parameterValue(ttlSpec(), override);
}

export function collectCiFromPath(options: {
  readonly report?: string;
  readonly commit?: string;
  readonly asOf?: string;
  readonly repoRoot?: string;
}): CiCollectorReport {
  const ttl = ciCollectorFreshnessTtl();
  const asOf = options.asOf ?? new Date().toISOString();
  const extras: CiUnknown[] = [];
  let doc: Record<string, unknown> | undefined;

  if (options.report === undefined || options.report.trim().length === 0) {
    extras.push({ kind: "missing_report", ref: "report" });
  } else {
    const path = resolveReportPath(options.report, options.repoRoot ?? REPO_ROOT);
    if (!existsSync(path)) {
      extras.push({ kind: "missing_report", ref: path });
    } else {
      try {
        const loaded = loadDocument(path);
        if (!isRecord(loaded)) {
          extras.push({ kind: "malformed_report", ref: path });
        } else {
          doc = loaded;
        }
      } catch {
        extras.push({ kind: "malformed_report", ref: path });
      }
    }
  }

  const commit =
    options.commit?.trim() ||
    (typeof doc?.["commit"] === "string" ? doc["commit"].trim() : "");
  const producedAt =
    typeof doc?.["produced_at"] === "string" ? doc["produced_at"] : undefined;

  return collectCiFacts({
    asOf,
    freshnessTtlSeconds: ttl,
    unknowns: extras,
    ...(commit.length > 0 ? { commit } : {}),
    ...(producedAt !== undefined ? { producedAt } : {}),
    ...(doc?.["checks"] !== undefined ? { checks: doc["checks"] } : {}),
    ...(doc?.["attestations"] !== undefined ? { attestations: doc["attestations"] } : {}),
  });
}

export function collectCiFacts(input: CollectCiFactsInput): CiCollectorReport {
  if (input.plane !== undefined) requireMaterializedPlane(input.plane);

  const unknowns: CiUnknown[] = [...(input.unknowns ?? [])];
  const commit = input.commit?.trim() ?? "";
  if (commit.length === 0) {
    return unknownReport(input.freshnessTtlSeconds, [
      { kind: "missing_commit", ref: "commit" },
      ...unknowns,
    ]);
  }

  const { checks, bad } = parseChecks(input.checks);
  unknowns.push(...bad);
  if (input.checks === undefined) {
    unknowns.push({ kind: "missing_checks", ref: "checks" });
  }

  const attestations = parseAttestations(input.attestations);
  const producedAt = input.producedAt?.trim() ?? "";
  let ageSeconds: number | null = null;
  let freshness: CiFreshness = "unknown";
  if (producedAt.length === 0) {
    unknowns.push({ kind: "missing_produced_at", ref: "produced_at" });
  } else {
    const age = ageOf(producedAt, input.asOf);
    if (age === undefined) {
      unknowns.push({ kind: "missing_produced_at", ref: producedAt });
    } else {
      ageSeconds = age;
      freshness = snapshotIsStale(age, input.freshnessTtlSeconds) ? "stale" : "current";
    }
  }

  const currentChecks = freshness === "current" ? checks : [];
  const digest = digestOf({
    commit,
    produced_at: producedAt,
    checks: checks.map((item) => ({ name: item.name, conclusion: item.conclusion })),
  });
  const reportAttestation: CiAttestationFact = {
    kind: "ci-report",
    digest,
    plane: MATERIALIZED_PLANE,
  };

  return {
    collector_id: CI_COLLECTOR_ID,
    collector_version: CI_COLLECTOR_VERSION,
    plane: MATERIALIZED_PLANE,
    commit,
    coverage: coverageOf(unknowns, checks.length > 0, freshness),
    freshness,
    known_unknowns: unknowns,
    checks,
    current_checks: currentChecks,
    attestations: [reportAttestation, ...attestations],
    freshness_ttl_seconds: input.freshnessTtlSeconds,
    age_seconds: ageSeconds,
  };
}

export function ciFactsExit(report: CiCollectorReport): GltExitCode {
  return report.coverage === "unknown" ? ExitCode.EvidenceInsufficient : ExitCode.Success;
}

export function renderCiCollectorReport(report: CiCollectorReport): string {
  return JSON.stringify(report, null, 2);
}

export function runCiCollector(
  argv: readonly string[],
  env: { readonly repoRoot?: string } = {},
): { code: number; stdout: string; stderr: string } {
  try {
    const reportPath = flag(argv, "--report");
    const commit = flag(argv, "--commit");
    const asOf = flag(argv, "--as-of");
    const report = collectCiFromPath({
      repoRoot: env.repoRoot ?? REPO_ROOT,
      ...(reportPath !== undefined ? { report: reportPath } : {}),
      ...(commit !== undefined ? { commit } : {}),
      ...(asOf !== undefined ? { asOf } : {}),
    });
    const code = ciFactsExit(report);
    if (code === ExitCode.Success) {
      return { code, stdout: renderCiCollectorReport(report) + "\n", stderr: "" };
    }
    return {
      code,
      stdout: "",
      stderr:
        JSON.stringify({
          code,
          invariant: "PROTO-12",
          message: "ci collector did not accept a report without commit",
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

function unknownReport(ttl: number, unknowns: readonly CiUnknown[]): CiCollectorReport {
  return {
    collector_id: CI_COLLECTOR_ID,
    collector_version: CI_COLLECTOR_VERSION,
    plane: MATERIALIZED_PLANE,
    commit: null,
    coverage: "unknown",
    freshness: "unknown",
    known_unknowns: [...unknowns],
    checks: [],
    current_checks: [],
    attestations: [],
    freshness_ttl_seconds: ttl,
    age_seconds: null,
  };
}

function coverageOf(
  unknowns: readonly CiUnknown[],
  hasChecks: boolean,
  freshness: CiFreshness,
): CiCoverage {
  if (unknowns.length === 0 && hasChecks && freshness !== "unknown") return "established";
  return "partial";
}

function parseChecks(raw: unknown): { checks: CiCheckFact[]; bad: CiUnknown[] } {
  if (raw === undefined) return { checks: [], bad: [] };
  if (!Array.isArray(raw)) {
    return { checks: [], bad: [{ kind: "malformed_check", ref: "checks" }] };
  }
  const checks: CiCheckFact[] = [];
  const bad: CiUnknown[] = [];
  for (const [index, item] of raw.entries()) {
    if (!isRecord(item) || typeof item["name"] !== "string" || item["name"].length === 0) {
      bad.push({ kind: "malformed_check", ref: `checks[${String(index)}]` });
      continue;
    }
    const conclusion = typeof item["conclusion"] === "string" ? item["conclusion"] : "";
    if (conclusion.length === 0) {
      bad.push({ kind: "malformed_check", ref: item["name"] });
      continue;
    }
    checks.push({ name: item["name"], conclusion, plane: MATERIALIZED_PLANE });
  }
  return { checks, bad };
}

function parseAttestations(raw: unknown): CiAttestationFact[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!isRecord(item) || typeof item["kind"] !== "string" || typeof item["digest"] !== "string") {
      return [];
    }
    if (!item["digest"].startsWith("sha256:")) return [];
    return [{ kind: item["kind"], digest: item["digest"], plane: MATERIALIZED_PLANE }];
  });
}

function ageOf(producedAt: string, asOf: string): number | undefined {
  const start = Date.parse(producedAt);
  const end = Date.parse(asOf);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  return Math.floor((end - start) / 1000);
}

function ttlSpec() {
  for (const card of loadParameterCards()) {
    const spec = parameterSpecFromCard(card);
    if (spec.id === TTL_PARAM) return spec;
  }
  throw contractInvalid("parameter card missing", [TTL_PARAM]);
}

function resolveReportPath(flag: string, repoRoot: string): string {
  return isAbsolute(flag) ? flag : resolve(repoRoot, flag);
}

function flag(argv: readonly string[], name: string): string | undefined {
  const i = argv.findIndex((item) => item === name);
  const value = i >= 0 ? argv[i + 1] : undefined;
  return typeof value === "string" && value.length > 0 && !value.startsWith("-") ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
