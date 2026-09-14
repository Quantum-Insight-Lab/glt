import { describe, expect, it } from "vitest";
import {
  BUILD_METRIC_NAMES,
  BuildMetric,
  DLP_CANARY,
  TELEMETRY_STEP,
  containsRawPii,
  publishBuildMetrics,
  scrubTelemetry,
} from "./telemetry.ts";

const BUILD = {
  glt_structural_coverage: 0,
  glt_boundary_violations_total: 0,
  glt_duplicate_implementations: 0,
  glt_registry_drift: 0,
  glt_import_cycles: 0,
  glt_graph_change_lead_time: [],
};

describe("DEV-24 telemetry scrub", () => {
  it("is the DEV-24 step", () => {
    expect(TELEMETRY_STEP).toBe("glt.dev.24");
  });

  it("publishes every Build metric name", () => {
    const names = publishBuildMetrics(BUILD).map((point) => point.name);
    expect(names).toEqual([...BUILD_METRIC_NAMES]);
    expect(names).toContain(BuildMetric.StructuralCoverage);
    expect(names).toContain(BuildMetric.GraphChangeLeadTime);
  });

  it("INV-11 canary in the payload is dropped and counted as a leak", () => {
    const result = scrubTelemetry({
      "glt.trace_id": "opaque-trace",
      secret: DLP_CANARY,
      "glt.snapshot_id": `snap-${DLP_CANARY}`,
    });
    expect(result.canary_leak).toBe(true);
    expect(result.payload["secret"]).toBeUndefined();
    expect(result.payload["glt.snapshot_id"]).toBeUndefined();
    expect(result.payload["glt.trace_id"]).toBe("opaque-trace");
  });

  it("PROTO-18 raw PII is not kept on the allowlist", () => {
    expect(containsRawPii("user@example.com")).toBe(true);
    expect(containsRawPii({ email: "user@example.com" })).toBe(true);
    expect(containsRawPii({ "glt.trace_id": "opaque-trace" })).toBe(false);
    const result = scrubTelemetry({
      "glt.trace_id": "opaque-trace",
      email: "user@example.com",
      prompt: "do not export this",
    });
    expect(result.payload).toEqual({ "glt.trace_id": "opaque-trace" });
    expect(result.dropped).toEqual(["email", "prompt"]);
  });
});
