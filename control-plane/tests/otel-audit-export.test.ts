import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXPORT_STEP, auditGenesisPrevHash, exportAuditChain } from "@glt/audit";
import { EventType, PACK } from "@glt/contracts";
import {
  BUILD_METRIC_NAMES,
  DLP_CANARY,
  DLP_LEAK_METRIC,
  SERVICE_NAME,
  containsRawPii,
  hashAuditRecord,
} from "@glt/domain";
import { OTEL_STEP, exportOtel } from "@glt/collectors";

const BUILD = {
  glt_structural_coverage: 0,
  glt_boundary_violations_total: 0,
  glt_duplicate_implementations: 0,
  glt_registry_drift: 0,
  glt_import_cycles: 0,
  glt_graph_change_lead_time: [],
};

describe("DEV-24 OTel and audit export", () => {
  it("is the DEV-24 step", () => {
    expect(OTEL_STEP).toBe("glt.dev.24");
    expect(EXPORT_STEP).toBe("glt.dev.24");
  });

  it("publishes every Build metric from metrics.md", () => {
    const listed = buildNamesFromMetricsMd();
    expect(listed).toEqual([...BUILD_METRIC_NAMES]);
    const exported = exportOtel({
      resource: { registry_version: "0.2.0", snapshot_id: "snap-1" },
      build: BUILD,
    });
    const names = exported.metrics.map((point) => point.name);
    for (const name of BUILD_METRIC_NAMES) expect(names).toContain(name);
    expect(exported.resource["service.name"]).toBe(SERVICE_NAME);
    expect(exported.resource["glt.registry_version"]).toBe("0.2.0");
    expect(exported.metrics.some((point) => point.name === DLP_LEAK_METRIC)).toBe(true);
  });

  it("INV-11 canary is dropped before export and counted", () => {
    const exported = exportOtel({
      resource: { registry_version: "0.2.0" },
      build: BUILD,
      traces: [{ "glt.trace_id": "opaque-trace", note: DLP_CANARY }],
    });
    expect(exported.glt_dlp_canary_leak_total).toBeGreaterThan(0);
    expect(JSON.stringify(exported.traces)).not.toContain(DLP_CANARY);
    expect(exported.traces[0]?.["glt.trace_id"]).toBe("opaque-trace");
  });

  it("PROTO-18 raw PII does not survive in traces", () => {
    const exported = exportOtel({
      resource: { registry_version: "0.2.0" },
      build: BUILD,
      traces: [
        {
          "glt.trace_id": "opaque-trace",
          email: "alice@example.com",
          prompt: "user text",
        },
      ],
    });
    expect(containsRawPii(exported.traces)).toBe(false);
    expect(JSON.stringify(exported)).not.toContain("alice@example.com");
    expect(exported.traces[0]?.["glt.trace_id"]).toBe("opaque-trace");
  });

  it("exportAuditChain emits EventType.AuditAppended", () => {
    const record_id = "aud-export-1";
    const prev_hash = auditGenesisPrevHash();
    const exported = exportAuditChain([
      {
        record_id,
        prev_hash,
        record_hash: hashAuditRecord({ record_id, prev_hash }),
        timestamp: "2026-08-14T10:00:00Z",
        event_type: EventType.SnapshotCompiled,
      },
    ]);
    expect(exported.events).toHaveLength(1);
    expect(exported.events[0]?.event_type).toBe(EventType.AuditAppended);
    expect(exported.events[0]?.payload).toEqual({ record_id, prev_hash });
    expect(containsRawPii(exported)).toBe(false);
  });
});

function buildNamesFromMetricsMd(): string[] {
  const text = readFileSync(join(PACK.docs, "OBSERVABILITY", "metrics.md"), "utf8");
  const start = text.indexOf("## Build (structural integrity)");
  const rest = text.slice(start);
  const next = rest.indexOf("\n## ", 1);
  const section = next < 0 ? rest : rest.slice(0, next);
  return [...section.matchAll(/^\| `([^`]+)` /gm)].map((m) => m[1] ?? "");
}
