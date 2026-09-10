import { describe, expect, it } from "vitest";
import { ExitCode, GltError, digestOfUtf8 } from "@glt/domain";
import { normalizeText } from "@glt/contracts";
import {
  collectGitFacts,
  gitFactsExit,
  reportHasPolicyFields,
  requireMaterializedPlane,
  type GitCollectorReport,
  type GitTree,
} from "./git.ts";

const TTL = 3600;
const CANARY = "UNIQUE_PAYLOAD_CANARY_DEV13";
const SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const DOMAIN_JSON = JSON.stringify({
  name: "@glt/domain",
  dependencies: { "@glt/contracts": "workspace:*" },
  extra: CANARY,
});
const CONTRACTS_JSON = JSON.stringify({ name: "@glt/contracts" });
const WORKSPACE = "packages:\n  - control-plane/packages/*\n";

function fakeGit(
  files: Record<string, string>,
  opts: { sha?: string; url?: string; missing?: boolean } = {},
): GitTree {
  return {
    revParse: (commit) => {
      if (opts.missing === true || commit.length === 0) return undefined;
      return opts.sha ?? SHA;
    },
    show: (_commit, path) => files[path],
    lsFiles: () => Object.keys(files),
    remoteUrl: () => opts.url,
  };
}

function baseFiles(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "pnpm-workspace.yaml": WORKSPACE,
    "control-plane/packages/domain/package.json": DOMAIN_JSON,
    "control-plane/packages/contracts/package.json": CONTRACTS_JSON,
    ...extra,
  };
}

describe("DEV-13 git collector", () => {
  it("PROTO-12 missing commit is unknown coverage, not an established empty graph", () => {
    const report = collectGitFacts({
      commit: "",
      git: fakeGit(baseFiles(), { url: "https://example.invalid/repo.git" }),
      freshnessTtlSeconds: TTL,
    });
    expect(report.coverage).toBe("unknown");
    expect(report.module_graph.nodes).toEqual([]);
    expect(report.source_digests).toEqual({});
    expect(report.known_unknowns.some((item) => item.kind === "missing_commit")).toBe(true);
    expect(gitFactsExit(report)).toBe(ExitCode.EvidenceInsufficient);
  });

  it("PROTO-12 missing git object is unknown, not success", () => {
    const report = collectGitFacts({
      commit: "deadbeef",
      git: fakeGit(baseFiles(), { missing: true, url: "https://example.invalid/repo.git" }),
      freshnessTtlSeconds: TTL,
    });
    expect(report.coverage).toBe("unknown");
    expect(gitFactsExit(report)).toBe(ExitCode.EvidenceInsufficient);
  });

  it("PROTO-12 missing CODEOWNERS is null hints, not an empty owner list", () => {
    const report = collectGitFacts({
      commit: SHA,
      repositoryUrl: "https://example.invalid/repo.git",
      git: fakeGit(baseFiles()),
      freshnessTtlSeconds: TTL,
    });
    expect(report.file_ownership_hints).toBeNull();
    expect(report.known_unknowns.some((item) => item.kind === "missing_ownership")).toBe(true);
    expect(report.coverage).toBe("partial");
    expect(gitFactsExit(report)).toBe(ExitCode.Success);
  });

  it("INV-03 two collects at the same commit yield identical source_digests", () => {
    const git = fakeGit(baseFiles(), { url: "https://example.invalid/repo.git" });
    const left = collectGitFacts({ commit: SHA, git, freshnessTtlSeconds: TTL });
    const right = collectGitFacts({ commit: SHA, git, freshnessTtlSeconds: TTL });
    expect(left.source_digests).toEqual(right.source_digests);
    expect(left.source_digests["pnpm-workspace.yaml"]).toBe(digestOfUtf8(normalizeText(WORKSPACE)));
    expect(left.source_digests["control-plane/packages/domain/package.json"]).toBe(
      digestOfUtf8(normalizeText(DOMAIN_JSON)),
    );
  });

  it("module graph edges are workspace dependencies, facts not policy", () => {
    const report = collectGitFacts({
      commit: SHA,
      repositoryUrl: "https://example.invalid/repo.git",
      git: fakeGit(baseFiles()),
      freshnessTtlSeconds: TTL,
    });
    expect(report.plane).toBe("materialized");
    expect(report.module_graph.nodes.map((n) => n.id).sort()).toEqual([
      "control-plane/packages/contracts",
      "control-plane/packages/domain",
    ]);
    expect(report.module_graph.edges).toEqual([
      {
        from: "control-plane/packages/domain",
        to: "control-plane/packages/contracts",
        relation: "depends_on",
        plane: "materialized",
      },
    ]);
    expect(reportHasPolicyFields(report)).toBe(false);
  });

  it("git collector facts stay on the materialized plane; intended is rejected", () => {
    expect(() => requireMaterializedPlane("intended")).toThrow(GltError);
    expect(() =>
      collectGitFacts({
        commit: SHA,
        plane: "intended",
        git: fakeGit(baseFiles()),
        freshnessTtlSeconds: TTL,
      }),
    ).toThrow(GltError);
  });

  it("privacy: file bodies are not in the report", () => {
    const report = collectGitFacts({
      commit: SHA,
      repositoryUrl: "https://example.invalid/repo.git",
      git: fakeGit(baseFiles()),
      freshnessTtlSeconds: TTL,
    });
    expect(JSON.stringify(report)).not.toContain(CANARY);
  });

  it("a policy field on a fixture fails the no-policy check", () => {
    const report = collectGitFacts({
      commit: SHA,
      repositoryUrl: "https://example.invalid/repo.git",
      git: fakeGit(baseFiles()),
      freshnessTtlSeconds: TTL,
    });
    const polluted = { ...report, release: [] };
    expect(reportHasPolicyFields(polluted as GitCollectorReport)).toBe(true);
    expect(reportHasPolicyFields(report)).toBe(false);
  });

  it("CODEOWNERS at the commit becomes ownership hints", () => {
    const report = collectGitFacts({
      commit: SHA,
      repositoryUrl: "https://example.invalid/repo.git",
      git: fakeGit(baseFiles({ ".github/CODEOWNERS": "* @glt/owners\n" })),
      freshnessTtlSeconds: TTL,
    });
    expect(report.file_ownership_hints).toEqual([
      { pattern: "*", owners: ["@glt/owners"], plane: "materialized" },
    ]);
    expect(report.coverage).toBe("established");
    expect(report.known_unknowns).toEqual([]);
  });
});
