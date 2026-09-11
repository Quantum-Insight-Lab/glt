import { describe, expect, it } from "vitest";
import { comparePlanes, planeNodesFromGitModules, planeNodesFromRegistryEntries } from "./planes.ts";

describe("DEV-18 plane comparison", () => {
  it("keeps intended and materialized as two lists and does not merge them", () => {
    const report = comparePlanes({
      intended: [{ id: "glt.controlplane.domain", path: "control-plane/packages/domain" }],
      materialized: [{ id: "control-plane/packages/domain", path: "control-plane/packages/domain" }],
    });
    expect(report.intended_ids).toEqual(["glt.controlplane.domain"]);
    expect(report.materialized_ids).toEqual(["control-plane/packages/domain"]);
    expect(report.intended_ids).not.toEqual(report.materialized_ids);
    expect(report.rows).toEqual([
      {
        id: "glt.controlplane.domain",
        presence: "both",
        class: "aligned",
        path: "control-plane/packages/domain",
      },
    ]);
  });

  it("PROTO-05 a planned node with expected_from_step is expected, not broken", () => {
    const report = comparePlanes({
      intended: [
        {
          id: "glt.dev.19",
          path: "glt-specpack/docs/DEV/19-coverage-manifest.md",
          expectedFromStep: "glt.dev.19",
        },
      ],
      materialized: [],
    });
    expect(report.rows).toEqual([
      {
        id: "glt.dev.19",
        presence: "intended",
        class: "expected",
        path: "glt-specpack/docs/DEV/19-coverage-manifest.md",
        expected_from_step: "glt.dev.19",
      },
    ]);
    expect(report.rows.some((row) => row.class === "expected")).toBe(true);
    expect(report.rows.some((row) => (row.class as string) === "broken")).toBe(false);
  });

  it("a mismatch without expected_from_step is plane_drift, not a breakage", () => {
    const report = comparePlanes({
      intended: [{ id: "glt.controlplane.runner", path: "control-plane/packages/runner" }],
      materialized: [{ id: "control-plane/packages/extra", path: "control-plane/packages/extra" }],
    });
    expect(report.rows.map((row) => row.class)).toEqual(["plane_drift", "plane_drift"]);
    expect(report.rows.every((row) => row.class === "plane_drift")).toBe(true);
    expect(report.rows.some((row) => (row.class as string) === "broken")).toBe(false);
    expect(report.rows.some((row) => row.presence === "intended")).toBe(true);
    expect(report.rows.some((row) => row.presence === "materialized")).toBe(true);
  });

  it("registry entries and git modules stay on their own planes", () => {
    const intended = planeNodesFromRegistryEntries([
      {
        id: "glt.controlplane.cli",
        spec: {
          node: {
            sources: [{ path: "control-plane/packages/cli" }],
            delivery: { expectedFromStep: "glt.dev.06" },
          },
        },
      },
    ]);
    const materialized = planeNodesFromGitModules([{ id: "control-plane/packages/cli" }]);
    expect(intended[0]).toEqual({
      id: "glt.controlplane.cli",
      path: "control-plane/packages/cli",
      expectedFromStep: "glt.dev.06",
    });
    expect(materialized[0]).toEqual({
      id: "control-plane/packages/cli",
      path: "control-plane/packages/cli",
    });
    const report = comparePlanes({ intended, materialized });
    expect(report.rows[0]?.class).toBe("aligned");
    expect(report.intended_ids).toEqual(["glt.controlplane.cli"]);
    expect(report.materialized_ids).toEqual(["control-plane/packages/cli"]);
  });
});
