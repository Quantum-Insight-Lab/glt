import { describe, expect, it } from "vitest";
import { bodyLinkTargets, parseFrontmatter } from "@glt/contracts";
import { findCycles, findDanglingDependencies, findDuplicateIds } from "@glt/domain";
import { lintDocs, renderLintReport, run } from "@glt/cli";

describe("glt lint docs on the pack", () => {
  const report = lintDocs();

  it("reports no findings", () => {
    expect(report.findings.map((f) => `${f.kind} ${f.doc}: ${f.detail}`)).toEqual([]);
  });

  it("actually reads documents rather than finding none", () => {
    expect(report.checked).toBeGreaterThan(50);
  });

  it("exits 0 through the CLI when the pack is clean", async () => {
    const result = await run(["lint", "docs", "-o", "json"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).findings).toEqual([]);
  });
});

describe("frontmatter parsing catches the ways it breaks", () => {
  const valid = ["---", "id: glt.doc.x", "owner: engineering", "---", "", "# Title"].join("\n");

  it("parses a well-formed document", () => {
    const parsed = parseFrontmatter(valid);
    expect(parsed.parseError).toBeUndefined();
    expect(parsed.frontmatter?.["id"]).toBe("glt.doc.x");
    expect(parsed.body).toContain("# Title");
  });

  it("reports a block that a formatter left unclosed", () => {
    // The real damage: `id:` became a heading and the closing --- was dropped.
    const damaged = ["---", "", "## id: glt.dev.01", "", "owner: engineering", "", "# Title"].join(
      "\n",
    );
    expect(parseFrontmatter(damaged).parseError).toMatch(/не закрыт/);
  });

  it("reports invalid YAML instead of skipping the document", () => {
    const broken = ["---", "id: [unclosed", "---", "", "# Title"].join("\n");
    expect(parseFrontmatter(broken).parseError).toMatch(/^YAML:/);
  });

  it("reports a document with no frontmatter at all", () => {
    expect(parseFrontmatter("# Just a heading\n").parseError).toMatch(/не начинается/);
  });
});

describe("body link extraction", () => {
  it("takes relative targets and drops anchors and external urls", () => {
    const body = [
      "[a](../SPEC/registry.md)",
      "[b](https://example.com/x)",
      "[c](#section)",
      "[d](../SPEC/impact.md#traversal)",
      "![img](../assets/pic.png)",
    ].join("\n");
    expect(bodyLinkTargets(body)).toEqual([
      "../SPEC/impact.md",
      "../SPEC/registry.md",
      "../assets/pic.png",
    ]);
  });
});

describe("dependency graph primitives", () => {
  it("finds a cycle and reports the whole path", () => {
    const cycles = findCycles([
      { id: "a", dependsOn: ["b"] },
      { id: "b", dependsOn: ["a"] },
      { id: "c", dependsOn: [] },
    ]);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(["a", "b", "a"]);
  });

  it("reports one cycle once, not once per entry point", () => {
    const cycles = findCycles([
      { id: "a", dependsOn: ["b"] },
      { id: "b", dependsOn: ["c"] },
      { id: "c", dependsOn: ["a"] },
    ]);
    expect(cycles).toHaveLength(1);
  });

  it("returns nothing for an acyclic graph", () => {
    expect(
      findCycles([
        { id: "a", dependsOn: ["b"] },
        { id: "b", dependsOn: [] },
      ]),
    ).toEqual([]);
  });

  it("finds dangling dependencies", () => {
    expect(findDanglingDependencies([{ id: "a", dependsOn: ["missing"] }])).toEqual([
      { from: "a", missing: "missing" },
    ]);
  });

  it("finds duplicate ids", () => {
    expect(
      findDuplicateIds([
        { id: "a", dependsOn: [] },
        { id: "a", dependsOn: [] },
      ]),
    ).toEqual(["a"]);
  });
});

describe("report rendering", () => {
  it("says plainly when there is nothing to report", () => {
    expect(renderLintReport({ checked: 92, cycles: 0, findings: [] })).toContain("замечаний нет");
  });

  it("names the kind, the document and the detail", () => {
    const text = renderLintReport({
      checked: 1,
      cycles: 0,
      findings: [{ kind: "link-broken", doc: "docs/x.md", detail: "../gone.md" }],
    });
    expect(text).toContain("link-broken");
    expect(text).toContain("docs/x.md");
    expect(text).toContain("../gone.md");
  });
});
