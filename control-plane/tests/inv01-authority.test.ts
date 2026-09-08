import { describe, expect, it } from "vitest";
import { PACK, loadPackDocs, loadYaml } from "@glt/contracts";
import { run, runLintAuthority } from "@glt/cli";
import {
  ExitCode,
  enforceAuthorityMap,
  factClassesFromMap,
  sourceConflict,
  type FactClass,
} from "@glt/domain";
import { createWriter } from "../packages/cli/src/output.ts";

const committed = factClassesFromMap(loadYaml(PACK.authorityMap));

const base: FactClass[] = [
  {
    id: "glt-id-registry",
    owner: "registry",
    authoritativePaths: ["registry/"],
  },
  {
    id: "engineering-contract",
    owner: "engineering",
    authoritativePaths: ["docs/SPEC/"],
  },
];

function normativeOwners() {
  return loadPackDocs().flatMap((doc) => {
    const owner = doc.frontmatter?.owner;
    if (doc.frontmatter?.normativity !== "normative" || typeof owner !== "string") return [];
    return [{ path: doc.path, owner }];
  });
}

describe("INV-01 single authority per fact class", () => {
  it("INV-01 committed authority map has one owner per class", () => {
    const report = enforceAuthorityMap({ classes: committed, normativeDocs: normativeOwners() });
    expect(report.findings.map((f) => `${f.kind}: ${f.detail}`)).toEqual([]);
    expect(report.conflict).toBe("none");
    expect(report.blocked).toBe(false);
  });

  it("INV-01 two owners of one fact class fail the check", () => {
    const report = enforceAuthorityMap({
      classes: [
        ...base,
        { id: "glt-id-registry", owner: "dashboard", authoritativePaths: ["registry/"] },
      ],
      normativeDocs: [],
    });
    expect(report.blocked).toBe(true);
    expect(report.conflict).toBe("source_conflict");
    expect(
      report.findings.some((f) => f.kind === "duplicate-class-owner" && f.invariant === "INV-01"),
    ).toBe(true);
  });

  it("INV-01 owner as a list is two owners of one class", () => {
    const classes = factClassesFromMap({
      spec: { fact_classes: [{ id: "x", owner: ["a", "b"], authoritative_paths: [] }] },
    });
    const report = enforceAuthorityMap({ classes, normativeDocs: [] });
    expect(report.findings.some((f) => f.kind === "duplicate-class-owner")).toBe(true);
    expect(report.blocked).toBe(true);
  });

  it("INV-01 a normative document whose owner is not in the map fails", () => {
    const report = enforceAuthorityMap({
      classes: base,
      normativeDocs: [{ path: "docs/SPEC/secret.md", owner: "not-a-role" }],
    });
    expect(report.findings.some((f) => f.kind === "owner-unknown")).toBe(true);
    expect(report.conflict).toBe("source_conflict");
    expect(report.blocked).toBe(true);
  });

  it("INV-01 a path claimed by two classes with different owners fails", () => {
    const report = enforceAuthorityMap({
      classes: [
        ...base,
        {
          id: "product-scope",
          owner: "product",
          authoritativePaths: ["docs/SPEC/"],
        },
      ],
      normativeDocs: [],
    });
    expect(report.findings.some((f) => f.kind === "path-claimed-twice")).toBe(true);
    expect(report.conflict).toBe("source_conflict");
  });

  it("INV-01 two classes with the same owner may share a path", () => {
    const report = enforceAuthorityMap({
      classes: [
        { id: "glt-id-registry", owner: "registry", authoritativePaths: ["registry/"] },
        { id: "glyph-alias-visual", owner: "registry", authoritativePaths: ["registry/"] },
      ],
      normativeDocs: [],
    });
    expect(report.findings).toEqual([]);
    expect(report.blocked).toBe(false);
  });

  it("INV-01 a nested path is not the same claim as its prefix", () => {
    const report = enforceAuthorityMap({
      classes: [
        { id: "engineering-contract", owner: "engineering", authoritativePaths: ["docs/SPEC/"] },
        { id: "policy-approval", owner: "policy-engine", authoritativePaths: ["docs/SPEC/policy.md"] },
      ],
      normativeDocs: [],
    });
    expect(report.blocked).toBe(false);
  });

  it("INV-01 inputs are not authoritative paths", () => {
    const classes = factClassesFromMap({
      spec: {
        fact_classes: [
          {
            id: "intended-topology",
            owner: "snapshot-compiler",
            inputs: ["docs/SPEC/", "registry/"],
            outputs: ["snapshots/intended/"],
          },
        ],
      },
    });
    expect(classes[0]?.authoritativePaths).toEqual([]);
  });

  it("INV-01 conflict reports source_conflict and blocks actions above read, without picking a winner", () => {
    const report = enforceAuthorityMap({
      classes: [
        { id: "glt-id-registry", owner: "registry", authoritativePaths: ["registry/"] },
        { id: "glt-id-registry", owner: "engineering", authoritativePaths: ["registry/"] },
      ],
      normativeDocs: [],
    });
    expect(report.conflict).toBe("source_conflict");
    expect(report.actions_above).toBe("read");
    expect(report.blocked).toBe(true);
    expect(report.findings.some((f) => f.detail.includes("engineering wins"))).toBe(false);
    expect(report.findings.some((f) => f.detail.includes("выбирает"))).toBe(false);
  });

  it("INV-01 sourceConflict is exit 6", () => {
    const error = sourceConflict("two owners", ["glt-id-registry"], "INV-01");
    expect(error.code).toBe(ExitCode.SourceConflict);
    expect(error.code).toBe(6);
    expect(error.invariant).toBe("INV-01");
  });

  it("INV-01 glt lint authority succeeds on the committed pack", async () => {
    const result = await run(["lint", "authority", "-o", "json"]);
    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout) as { blocked: boolean; conflict: string };
    expect(report.blocked).toBe(false);
    expect(report.conflict).toBe("none");
  });

  it("INV-01 glt lint authority exits 6 on a duplicate owner", () => {
    let stdout = "";
    const writer = createWriter(
      { format: "json", quiet: true },
      { out: (s) => (stdout += s), err: () => {} },
    );
    const code = runLintAuthority(writer, {
      loadClasses: () => [
        { id: "x", owner: "a", authoritativePaths: [] },
        { id: "x", owner: "b", authoritativePaths: [] },
      ],
      loadNormativeDocs: () => [],
    });
    expect(code).toBe(ExitCode.SourceConflict);
    expect(code).not.toBe(ExitCode.ContractInvalid);
    expect(code).not.toBe(ExitCode.InvariantViolation);
    const report = JSON.parse(stdout) as {
      conflict: string;
      blocked: boolean;
      actions_above: string;
    };
    expect(report.conflict).toBe("source_conflict");
    expect(report.blocked).toBe(true);
    expect(report.actions_above).toBe("read");
  });
});
