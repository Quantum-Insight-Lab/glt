import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK } from "@glt/contracts";
import { run } from "@glt/cli";
import { collectHealth } from "../packages/cli/src/health.ts";

const GOLDEN = join(PACK.examples, "golden", "bootstrap-snapshot.json");
const CURRENT_AS_OF = "2026-08-14T10:00:00Z";
const STALE_AS_OF = "2026-08-14T12:00:01Z";

describe("DEV-17 glt health freshness and conflicts", () => {
  it("S-8 health TTL is the P01 card value, not a command literal", () => {
    const report = collectHealth({ snapshot: GOLDEN, asOf: CURRENT_AS_OF });
    expect(report.stale_after_seconds).toBe(3600);
    expect(report.age_seconds).toBe(0);
    expect(report.write_blocked).toBe(false);
    expect(report.conflict).toBe("none");
  });

  it("a snapshot older than P01 is stale, write-blocked, and still readable", async () => {
    const report = collectHealth({ snapshot: GOLDEN, asOf: STALE_AS_OF });
    expect(report.snapshot_freshness).toBe("stale");
    expect(report.age_seconds).toBeGreaterThan(report.stale_after_seconds);
    expect(report.write_blocked).toBe(true);
    expect(report.actions_above).toBe("read");

    const result = await run([
      "health",
      "--snapshot",
      "glt-specpack/contracts/examples/golden/bootstrap-snapshot.json",
      "--as-of",
      STALE_AS_OF,
      "-o",
      "json",
    ]);
    expect(result.code).toBe(5);
    expect(result.stdout.length).toBeGreaterThan(0);
    const body = JSON.parse(result.stdout) as {
      snapshot_freshness: string;
      write_blocked: boolean;
      conflict: string;
    };
    expect(body.snapshot_freshness).toBe("stale");
    expect(body.write_blocked).toBe(true);
    expect(body.conflict).toBe("none");
    expect(result.stderr).toContain("snapshot older than P01");
    expect(result.stderr).toContain("write and runner blocked");
  });
});
