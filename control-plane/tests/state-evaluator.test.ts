import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, loadJson } from "@glt/contracts";
import { run } from "@glt/cli";
import { asObservation, type CompiledSnapshot } from "@glt/domain";
import { collectHealth } from "../packages/cli/src/health.ts";

const GOLDEN = join(PACK.examples, "golden", "bootstrap-snapshot.json");
const AS_OF = "2026-08-14T10:00:00Z";

describe("DEV-16 glt health against the bootstrap slice", () => {
  it("PROTO-12 a current golden snapshot has unknown runtime, not healthy", () => {
    const report = collectHealth({ snapshot: GOLDEN, asOf: AS_OF });
    expect(report.snapshot_freshness).toBe("current");
    expect(report.age_seconds).toBe(0);
    expect(report.nodes.length).toBeGreaterThan(0);
    expect(report.nodes.every((node) => node.axes.runtime.value === "unknown")).toBe(true);
    expect(report.nodes.every((node) => asObservation(node.axes.runtime) === undefined)).toBe(true);
    expect(report.nodes.some((node) => node.axes.runtime.value === "healthy")).toBe(false);
    expect(report.known_unknowns.some((item) => item.kind === "missing_runtime")).toBe(true);
  });

  it("INV-04 inferred axes on the golden snapshot are not observations", () => {
    const report = collectHealth({ snapshot: GOLDEN, asOf: AS_OF });
    for (const node of report.nodes) {
      expect(node.axes.verification.provenance).not.toBe("observation");
      expect(node.axes.runtime.provenance).toBe("inference");
      expect(node.axes.freshness.provenance).toBe("inference");
      expect(asObservation(node.axes.runtime)).toBeUndefined();
      expect(node.axes.delivery.provenance).toBe("declaration");
    }
  });

  it("INV-03 two health reads of the same pin are identical", () => {
    const left = collectHealth({ snapshot: GOLDEN, asOf: AS_OF });
    const right = collectHealth({ snapshot: GOLDEN, asOf: AS_OF });
    expect(left).toEqual(right);
  });

  it("glt health does not write the workspace and exits 5 without runtime signals", async () => {
    const snapshot = loadJson<CompiledSnapshot>(GOLDEN);
    const result = await run([
      "health",
      "--snapshot",
      "glt-specpack/contracts/examples/golden/bootstrap-snapshot.json",
      "--as-of",
      snapshot.as_of,
      "-o",
      "json",
    ]);
    expect(result.code).toBe(5);
    expect(result.stdout.length).toBeGreaterThan(0);
    const body = JSON.parse(result.stdout) as { snapshot_freshness: string; nodes: { axes: { runtime: { value: string } } }[] };
    expect(body.snapshot_freshness).toBe("current");
    expect(body.nodes.every((node) => node.axes.runtime.value === "unknown")).toBe(true);
  });
});
