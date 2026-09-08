import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT, loadParameterCards } from "@glt/contracts";
import { parameterSpecFromCard, parameterValue } from "@glt/domain";

const DOMAIN_SRC = join(REPO_ROOT, "control-plane", "packages", "domain", "src");

/** Documented legal exception from the S-8 sheet: constants of format, not of behaviour. */
const FORMAT_CONSTANT_FILES = new Set(["errors.ts", "canonical.ts", "digest.ts", "signature.ts"]);

const ALLOWED = new Set([-1, 0, 1, 2]);

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return tsFiles(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
}

describe("S-8 behaviour constants come from parameters/, not from literals", () => {
  it("S-8 domain contains no unexplained numeric literal", () => {
    const offenders: string[] = [];

    for (const file of tsFiles(DOMAIN_SRC)) {
      const name = relative(DOMAIN_SRC, file);
      if (FORMAT_CONSTANT_FILES.has(name)) continue;

      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .replace(/`(?:[^`\\]|\\.)*`/g, "``");

      for (const match of code.matchAll(/(?<![\w.$])-?\d+(?:\.\d+)?(?![\w.])/g)) {
        const value = Number(match[0]);
        if (!ALLOWED.has(value)) offenders.push(`${name}: ${match[0]}`);
      }
    }

    expect(offenders.join("\n")).toBe("");
  });

  it("S-8 every parameter card is readable through the loader", () => {
    const cards = loadParameterCards();
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      const spec = parameterSpecFromCard(card);
      expect(parameterValue(spec)).toBe(spec.default);
    }
  });
});
