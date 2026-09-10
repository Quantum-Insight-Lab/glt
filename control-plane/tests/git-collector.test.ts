import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "@glt/contracts";
import { COMMANDS, run } from "@glt/cli";
import {
  collectGitFromRepo,
  gitCollectorFreshnessTtl,
  runGitCollector,
} from "@glt/collectors";

describe("DEV-13 git collector against this repository", () => {
  it("INV-03 two collects at HEAD yield identical source_digests", () => {
    const left = collectGitFromRepo({
      repoRoot: REPO_ROOT,
      commit: "HEAD",
      repositoryUrl: "https://github.com/Quantum-Insight-Lab/glt.git",
    });
    const right = collectGitFromRepo({
      repoRoot: REPO_ROOT,
      commit: "HEAD",
      repositoryUrl: "https://github.com/Quantum-Insight-Lab/glt.git",
    });
    expect(left.commit).toMatch(/^[0-9a-f]{7,40}$/);
    expect(left.commit).toBe(right.commit);
    expect(left.source_digests).toEqual(right.source_digests);
    expect(Object.keys(left.source_digests).length).toBeGreaterThan(0);
    expect(left.module_graph.nodes.some((n) => n.name === "@glt/domain")).toBe(true);
    expect(left.freshness_ttl_seconds).toBe(gitCollectorFreshnessTtl());
  });

  it("PROTO-12 empty commit from the runner is evidence-insufficient, not stdout success", () => {
    const result = runGitCollector(["--commit", " "], { repoRoot: REPO_ROOT });
    expect(result.code).toBe(5);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("PROTO-12");
  });

  it("PROTO-12 a 40-hex that is not a git object is unknown, not a resolved tree", () => {
    const report = collectGitFromRepo({
      repoRoot: REPO_ROOT,
      commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      repositoryUrl: "https://github.com/Quantum-Insight-Lab/glt.git",
    });
    expect(report.coverage).toBe("unknown");
    expect(report.commit).toBe("deadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
    expect(report.module_graph.nodes).toEqual([]);
    expect(report.known_unknowns.some((item) => item.kind === "missing_git")).toBe(true);
  });

  it("S-10 glt collect is not a command", async () => {
    expect(COMMANDS.some((c) => c.name.includes("collect"))).toBe(false);
    const result = await run(["collect"]);
    expect(result.code).not.toBe(0);
  });
});
