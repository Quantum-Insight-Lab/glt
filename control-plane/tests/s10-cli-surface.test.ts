import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, readText } from "@glt/contracts";
import {
  ALLOWED_CAPABILITIES,
  COMMANDS,
  FORBIDDEN_COMMANDS,
  buildProgram,
  run,
} from "@glt/cli";
import { createWriter } from "../packages/cli/src/output.ts";

/**
 * cli.md is the contract; the parser is the implementation. This compares them
 * by set equality, because "we would notice a stray subcommand in review" is
 * exactly the assurance S-10 exists to replace.
 */
function declaredInSpec(): string[] {
  const md = readText(join(PACK.docs, "SPEC", "cli.md"));
  const table = md.slice(md.indexOf("## Commands"), md.indexOf("## Global flags"));
  return [...table.matchAll(/^\|\s*`glt ([^`]+)`/gm)]
    .map((m) => m[1]!.replace(/\s*[[<].*$/, "").trim())
    .sort();
}

/** Derived from buildProgram so the test never needs commander as a direct dependency. */
type Program = ReturnType<typeof buildProgram>;

function registeredInParser(): string[] {
  const writer = createWriter(
    { format: "json", quiet: true },
    { out: () => {}, err: () => {} },
  );
  const walk = (cmd: Program, prefix: string): string[] =>
    cmd.commands.flatMap((child: Program) => {
      const name = prefix ? `${prefix} ${child.name()}` : child.name();
      const nested = walk(child, name);
      return nested.length > 0 ? nested : [name];
    });
  return walk(buildProgram(writer), "").sort();
}

describe("S-10 CLI surface equals the allowlist", () => {
  it("S-10 parser command set equals cli.md", () => {
    expect(registeredInParser()).toEqual(declaredInSpec());
  });

  it("S-10 declared command table equals cli.md", () => {
    expect(COMMANDS.map((c) => c.name).sort()).toEqual(declaredInSpec());
  });

  it("S-10 every command maps to an allowed capability", () => {
    const bad = COMMANDS.filter(
      (c) => !(ALLOWED_CAPABILITIES as readonly string[]).includes(c.capability),
    );
    expect(bad.map((c) => `${c.name} -> ${c.capability}`)).toEqual([]);
  });

  it("S-10 no forbidden command exists in any form", () => {
    const surface = registeredInParser();
    const found = FORBIDDEN_COMMANDS.filter((f) =>
      surface.some((name) => name === f || name.endsWith(` ${f}`)),
    );
    expect(found).toEqual([]);
  });

  it("S-10 forbidden verbs do not appear as flags either", async () => {
    const help = await run(["--help"]);
    for (const verb of FORBIDDEN_COMMANDS) {
      expect(help.stderr + help.stdout).not.toContain(`--${verb}`);
    }
  });

  it("an unimplemented command reports usage error, never success", async () => {
    const result = await run(["compile", "snapshot", "-o", "json"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("not implemented in this build");
  });
});
