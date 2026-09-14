/**
 * Telemetry scrub and Build-metric catalog (DEV-24). Pure: payloads arrive
 * already parsed. Export I/O lives in collectors / audit.
 *
 * Contract: glt-specpack/docs/OBSERVABILITY/metrics.md
 *           glt-specpack/docs/SECURITY/privacy.md
 */

export const TELEMETRY_STEP = "glt.dev.24" as const;

export const SERVICE_NAME = "glt-controlplane" as const;

/** Injected in CI. Presence in an export is a leak (INV-11). */
export const DLP_CANARY = "glt-dlp-canary" as const;

export const DLP_LEAK_METRIC = "glt_dlp_canary_leak_total" as const;

export const BuildMetric = {
  StructuralCoverage: "glt_structural_coverage",
  BoundaryViolations: "glt_boundary_violations_total",
  DuplicateImplementations: "glt_duplicate_implementations",
  RegistryDrift: "glt_registry_drift",
  ImportCycles: "glt_import_cycles",
  GraphChangeLeadTime: "glt_graph_change_lead_time",
} as const;

export type BuildMetricName = (typeof BuildMetric)[keyof typeof BuildMetric];

export const BUILD_METRIC_NAMES: readonly BuildMetricName[] = [
  BuildMetric.StructuralCoverage,
  BuildMetric.BoundaryViolations,
  BuildMetric.DuplicateImplementations,
  BuildMetric.RegistryDrift,
  BuildMetric.ImportCycles,
  BuildMetric.GraphChangeLeadTime,
];

const ALLOWED_KEYS = new Set([
  "service.name",
  "glt.registry_version",
  "glt.snapshot_id",
  "glt.boundary_id",
  "glt.trace_id",
  "name",
  "type",
  "value",
  "observations",
  "record_id",
  "prev_hash",
  "event_type",
]);

const FORBIDDEN_KEYS = new Set([
  "email",
  "user_id",
  "userId",
  "prompt",
  "authorization",
  "cookie",
  "password",
  "api_key",
  "apiKey",
]);

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

export interface BuildMetricValues {
  readonly glt_structural_coverage: number;
  readonly glt_boundary_violations_total: number;
  readonly glt_duplicate_implementations: number;
  readonly glt_registry_drift: number;
  readonly glt_import_cycles: number;
  readonly glt_graph_change_lead_time: readonly number[];
}

export interface MetricPoint {
  readonly name: string;
  readonly type: "gauge" | "counter" | "histogram";
  readonly value?: number;
  readonly observations?: readonly number[];
}

export interface ScrubResult {
  readonly payload: Record<string, unknown>;
  readonly dropped: readonly string[];
  readonly canary_leak: boolean;
}

export function publishBuildMetrics(values: BuildMetricValues): readonly MetricPoint[] {
  return [
    gauge(BuildMetric.StructuralCoverage, values.glt_structural_coverage),
    counter(BuildMetric.BoundaryViolations, values.glt_boundary_violations_total),
    gauge(BuildMetric.DuplicateImplementations, values.glt_duplicate_implementations),
    gauge(BuildMetric.RegistryDrift, values.glt_registry_drift),
    gauge(BuildMetric.ImportCycles, values.glt_import_cycles),
    {
      name: BuildMetric.GraphChangeLeadTime,
      type: "histogram",
      observations: [...values.glt_graph_change_lead_time],
    },
  ];
}

export function scrubTelemetry(payload: Record<string, unknown>): ScrubResult {
  const dropped: string[] = [];
  const out: Record<string, unknown> = {};
  let canary = false;
  for (const [key, value] of Object.entries(payload)) {
    if (mentionsCanary(key, value)) {
      canary = true;
      dropped.push(key);
      continue;
    }
    if (FORBIDDEN_KEYS.has(key) || !ALLOWED_KEYS.has(key) || containsRawPii(value)) {
      dropped.push(key);
      continue;
    }
    out[key] = value;
  }
  return { payload: out, dropped, canary_leak: canary };
}

/** PROTO-18: raw PII is not a legal observation. */
export function containsRawPii(value: unknown): boolean {
  if (typeof value === "string") return hasPiiString(value);
  if (Array.isArray(value)) return value.some(containsRawPii);
  if (value !== null && typeof value === "object") {
    return Object.entries(value).some(([key, nested]) => FORBIDDEN_KEYS.has(key) || containsRawPii(nested));
  }
  return false;
}

function hasPiiString(value: string): boolean {
  return EMAIL.test(value) || value.includes(DLP_CANARY);
}

function mentionsCanary(key: string, value: unknown): boolean {
  if (key.includes(DLP_CANARY)) return true;
  return walkStrings(value).some((item) => item.includes(DLP_CANARY));
}

function walkStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(walkStrings);
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(walkStrings);
  }
  return [];
}

function gauge(name: BuildMetricName, value: number): MetricPoint {
  return { name, type: "gauge", value };
}

function counter(name: BuildMetricName, value: number): MetricPoint {
  return { name, type: "counter", value };
}
