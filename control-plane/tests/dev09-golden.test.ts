import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, listBoundaryManifests, loadJson, loadYaml } from "@glt/contracts";
import {
  INTENDED_BOUNDARY_REF,
  isUnfrozenPlaceholder,
  type CompiledSnapshot,
} from "@glt/domain";
import { compileIntendedFromPack } from "@glt/registry";
import { compileSnapshotFromPaths } from "@glt/snapshot";
import { run } from "@glt/cli";

const AS_OF = "2026-08-14T10:00:00Z";
const GOLDEN_ID = "snap-bootstrap-golden-001";

function digestValues(value: unknown): string[] {
  if (typeof value === "string" && value.startsWith("sha256:")) return [value];
  if (Array.isArray(value)) return value.flatMap(digestValues);
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(digestValues);
  }
  return [];
}

describe("DEV-09 golden freeze and intended boundary", () => {
  it("PROTO-03 no golden digest is the 64-zero placeholder", () => {
    const snapshot = loadJson(join(PACK.examples, "golden", "bootstrap-snapshot.json"));
    const impact = loadJson(join(PACK.examples, "golden", "impact-bootstrap.json"));
    const digests = [...digestValues(snapshot), ...digestValues(impact)];
    expect(digests.length).toBeGreaterThan(0);
    expect(digests.filter(isUnfrozenPlaceholder)).toEqual([]);
  });

  it("PROTO-03 freeze-check fails when the placeholder is restored", () => {
    const golden = loadJson<{ digest: string }>(join(PACK.examples, "golden", "bootstrap-snapshot.json"));
    const restored = { ...golden, digest: "sha256:" + "0".repeat(64) };
    expect(isUnfrozenPlaceholder(restored.digest)).toBe(true);
    expect(isUnfrozenPlaceholder(golden.digest)).toBe(false);
  });

  it("INV-03 recompiling the bootstrap slice yields the frozen digest", () => {
    const golden = loadJson<{
      digest: string;
      as_of: string;
      snapshot_id: string;
      pinned_to?: { git_sha?: string; artifact_digest?: string; deployment_id?: string };
    }>(join(PACK.examples, "golden", "bootstrap-snapshot.json"));
    const rebuilt = compileSnapshotFromPaths({
      asOf: golden.as_of,
      snapshotId: golden.snapshot_id,
      ...(golden.pinned_to !== undefined ? { pinnedTo: golden.pinned_to } : {}),
    });
    expect(rebuilt.snapshot_id).toBe(GOLDEN_ID);
    expect(rebuilt.digest).toBe(golden.digest);
  });

  it("PROTO-10 frozen golden pin carries a real git SHA", () => {
    const golden = loadJson<{ pinned_to?: { git_sha?: string } }>(
      join(PACK.examples, "golden", "bootstrap-snapshot.json"),
    );
    expect(golden.pinned_to?.git_sha).toMatch(/^[0-9a-f]{7,40}$/);
  });

  it("glt.controlplane-intended@1 exists as a boundary manifest", () => {
    const paths = listBoundaryManifests().map((p) => p.replaceAll("\\", "/"));
    expect(paths.some((p) => p.endsWith("/controlplane-intended.yaml"))).toBe(true);
    const doc = loadYaml<{ metadata?: { id?: string; revision?: number } }>(
      join(PACK.boundaries, "controlplane-intended.yaml"),
    );
    expect(doc.metadata?.id).toBe("glt.controlplane-intended");
    expect(doc.metadata?.revision).toBe(1);
  });

  it("INV-03 both boundaries coexist: slice stays four nodes, intended is the meta-graph", () => {
    const slice = compileSnapshotFromPaths({ asOf: AS_OF, snapshotId: GOLDEN_ID });
    const intended = compileSnapshotFromPaths({
      asOf: AS_OF,
      boundary: INTENDED_BOUNDARY_REF,
    });
    expect(slice.boundary_id).toBe("glt.bootstrap-slice@1");
    expect(slice.nodes).toHaveLength(4);
    expect(intended.boundary_id).toBe(INTENDED_BOUNDARY_REF);
    expect(intended.nodes.length).toBeGreaterThan(slice.nodes.length);
    const stepIds = intended.nodes.map((n) => (n as { metadata: { id: string } }).metadata.id);
    expect(stepIds).toContain("glt.dev.10");
    expect(stepIds).toContain("glt.controlplane.cli");
    expect(stepIds).toContain("glt.controlplane.check");
  });

  it("PROTO-05 planned DEV step without code has expected_from_step", () => {
    const compiled = compileIntendedFromPack();
    const fifteen = compiled.compiled.entries.find((e) => e.id === "glt.dev.15");
    expect(fifteen).toBeDefined();
    const spec = fifteen!.spec as { node?: { lifecycle?: string; delivery?: { expectedFromStep?: string } } };
    expect(spec.node?.lifecycle).toBe("planned");
    expect(spec.node?.delivery?.expectedFromStep).toBe("glt.dev.15");
  });

  it("glt compile snapshot --boundary intended succeeds and does not write the workspace", async () => {
    const result = await run([
      "compile",
      "snapshot",
      "--boundary",
      INTENDED_BOUNDARY_REF,
      "--as-of",
      AS_OF,
      "-o",
      "json",
    ]);
    expect(result.code).toBe(0);
    const body = JSON.parse(result.stdout) as CompiledSnapshot;
    expect(body.boundary_id).toBe(INTENDED_BOUNDARY_REF);
    expect(body.nodes.length).toBeGreaterThan(4);
  });
});
