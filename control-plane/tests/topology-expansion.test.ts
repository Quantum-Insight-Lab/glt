import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "@glt/contracts";
import { collectGitFromRepo } from "@glt/collectors";
import {
  comparePlanes,
  planeNodesFromGitModules,
  planeNodesFromRegistryEntries,
} from "@glt/domain";
import { compileIntendedFromPack } from "@glt/registry";

describe("DEV-18 intended vs materialized on this repository", () => {
  it("PROTO-05 planned DEV step without a package is expected, not broken", () => {
    const intended = compileIntendedFromPack();
    const git = collectGitFromRepo({
      repoRoot: REPO_ROOT,
      commit: "HEAD",
      repositoryUrl: "https://github.com/Quantum-Insight-Lab/glt.git",
    });
    const report = comparePlanes({
      intended: planeNodesFromRegistryEntries(intended.compiled.entries),
      materialized: planeNodesFromGitModules(git.module_graph.nodes),
    });

    expect(report.intended_ids).toContain("glt.controlplane.domain");
    expect(report.intended_ids).toContain("glt.dev.19");
    expect(report.materialized_ids).toContain("control-plane/packages/domain");
    expect(report.intended_ids).not.toEqual(report.materialized_ids);

    const domain = report.rows.find((row) => row.id === "glt.controlplane.domain");
    expect(domain?.presence).toBe("both");
    expect(domain?.class).toBe("aligned");

    const dashboard = report.rows.find((row) => row.id === "glt.controlplane.dashboard");
    const materializedDashboard = report.materialized_ids.includes("control-plane/packages/dashboard");
    expect(dashboard).toBeDefined();
    if (materializedDashboard) {
      expect(dashboard?.presence).toBe("both");
      expect(dashboard?.class).toBe("aligned");
    } else {
      expect(dashboard?.presence).toBe("intended");
      expect(dashboard?.class).toBe("plane_drift");
    }

    const api = report.rows.find((row) => row.id === "glt.controlplane.api");
    const materializedApi = report.materialized_ids.includes("control-plane/packages/api");
    expect(api).toBeDefined();
    if (materializedApi) {
      expect(api?.presence).toBe("both");
      expect(api?.class).toBe("aligned");
    } else {
      expect(api?.presence).toBe("intended");
      expect(api?.class).toBe("plane_drift");
    }

    const nineteen = report.rows.find((row) => row.id === "glt.dev.19");
    expect(nineteen?.class).toBe("expected");
    expect(nineteen?.presence).toBe("intended");
    expect(nineteen?.expected_from_step).toBe("glt.dev.19");

    const runner = report.rows.find((row) => row.id === "glt.controlplane.runner");
    expect(runner?.class).toBe("plane_drift");
    expect(runner?.presence).toBe("intended");

    expect(report.rows.some((row) => (row.class as string) === "broken")).toBe(false);
    expect(git.plane).toBe("materialized");
  });
});
