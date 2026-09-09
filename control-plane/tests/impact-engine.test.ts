import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, loadJson } from "@glt/contracts";
import { computeImpactFromPaths } from "@glt/impact";
import { run } from "@glt/cli";
import type { ImpactReportView } from "@glt/domain";

const GOLDEN_SNAPSHOT = join(PACK.examples, "golden", "bootstrap-snapshot.json");
const GOLDEN_IMPACT = join(PACK.examples, "golden", "impact-bootstrap.json");

describe("DEV-10 glt impact", () => {
  it("INV-05 PROTO-07 golden impact-bootstrap.json is reproduced exactly", () => {
    const golden = loadJson<ImpactReportView>(GOLDEN_IMPACT);
    const report = computeImpactFromPaths({ snapshot: GOLDEN_SNAPSHOT });
    expect(report).toEqual(golden);
  });

  it("glt impact --snapshot golden does not write the workspace", async () => {
    const result = await run([
      "impact",
      "--snapshot",
      "glt-specpack/contracts/examples/golden/bootstrap-snapshot.json",
      "-o",
      "json",
    ]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(loadJson(GOLDEN_IMPACT));
  });

  it("INV-05 feeding an impact report as --snapshot is rejected", async () => {
    const result = await run([
      "impact",
      "--snapshot",
      "glt-specpack/contracts/examples/golden/impact-bootstrap.json",
      "-o",
      "json",
    ]);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
  });
});
