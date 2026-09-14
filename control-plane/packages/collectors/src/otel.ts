/**
 * OTel export (DEV-24). Facts only: publishes already-computed Build metrics
 * and scrubbed trace attributes. No policy. No workspace write.
 *
 * Contract: glt-specpack/docs/SPEC/collectors.md
 *           glt-specpack/docs/OBSERVABILITY/metrics.md
 */
import {
  DLP_LEAK_METRIC,
  SERVICE_NAME,
  TELEMETRY_STEP,
  publishBuildMetrics,
  scrubTelemetry,
  type BuildMetricValues,
  type MetricPoint,
} from "@glt/domain";

export const OTEL_STEP = TELEMETRY_STEP;
export const OTEL_COLLECTOR_ID = "glt.collector.otel@1" as const;

export interface OtelResource {
  readonly registry_version: string;
  readonly snapshot_id?: string;
  readonly boundary_id?: string;
}

export interface ExportOtelInput {
  readonly resource: OtelResource;
  readonly build: BuildMetricValues;
  readonly traces?: readonly Record<string, unknown>[];
}

export interface OtelExport {
  readonly collector_id: typeof OTEL_COLLECTOR_ID;
  readonly resource: Record<string, string>;
  readonly metrics: readonly MetricPoint[];
  readonly traces: readonly Record<string, unknown>[];
  readonly glt_dlp_canary_leak_total: number;
}

export function exportOtel(input: ExportOtelInput): OtelExport {
  const resourceDraft: Record<string, unknown> = {
    "service.name": SERVICE_NAME,
    "glt.registry_version": input.resource.registry_version,
    ...(input.resource.snapshot_id !== undefined
      ? { "glt.snapshot_id": input.resource.snapshot_id }
      : {}),
    ...(input.resource.boundary_id !== undefined
      ? { "glt.boundary_id": input.resource.boundary_id }
      : {}),
  };
  const resource = scrubTelemetry(resourceDraft);
  let leaks = resource.canary_leak ? 1 : 0;
  const traces: Record<string, unknown>[] = [];
  for (const span of input.traces ?? []) {
    const scrubbed = scrubTelemetry(span);
    if (scrubbed.canary_leak) leaks += 1;
    traces.push(scrubbed.payload);
  }
  const metrics = [
    ...publishBuildMetrics(input.build),
    { name: DLP_LEAK_METRIC, type: "counter" as const, value: leaks },
  ];
  return {
    collector_id: OTEL_COLLECTOR_ID,
    resource: asStringRecord(resource.payload),
    metrics,
    traces,
    glt_dlp_canary_leak_total: leaks,
  };
}

function asStringRecord(payload: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
