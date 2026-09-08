import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT, readText } from "@glt/contracts";
import {
  extraSha256HashCalls,
  listedPaths,
  parseMechanismRegistry,
} from "@glt/domain";

const CONTROL_PLANE = join(REPO_ROOT, "control-plane");
const ALLOWED_HASH = "packages/domain/src/digest.ts";

function srcFiles(dir: string): { path: string; text: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" || entry.name === "node_modules" ? [] : srcFiles(path);
    }
    if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) return [];
    return [{ path, text: readFileSync(path, "utf8") }];
  });
}

function resolvedLocations(lives: string, mechanism: string): string[] {
  const ticks = listedPaths({ task: "", mechanism, lives });
  if (ticks.length > 0) {
    return ticks.map((p) =>
      p.startsWith("packages/") ? join(CONTROL_PLANE, p) : join(REPO_ROOT, p),
    );
  }
  if (mechanism.includes("vitest")) return [join(REPO_ROOT, "vitest.config.ts")];
  if (mechanism.includes("knip")) return [join(REPO_ROOT, "knip.json")];
  return [];
}

describe("S-4 one mechanism per task", () => {
  it("S-4 every mechanism listed in AGENTS.md exists on disk", () => {
    const agents = readText(join(REPO_ROOT, "AGENTS.md"));
    const rows = parseMechanismRegistry(agents);
    expect(rows.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const row of rows) {
      const locations = resolvedLocations(row.lives, row.mechanism);
      if (locations.length === 0) {
        missing.push(`${row.task}: no path in "${row.lives}"`);
        continue;
      }
      for (const location of locations) {
        if (!existsSync(location)) missing.push(`${row.task}: ${location}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("S-4 createHash(sha256) lives only in digest.ts", () => {
    const files = srcFiles(join(CONTROL_PLANE, "packages"));
    expect(extraSha256HashCalls(files, ALLOWED_HASH)).toEqual([]);
  });

  it("S-4 a second createHash(sha256) outside digest.ts fails the census", () => {
    const offenders = extraSha256HashCalls(
      [{ path: "packages/cli/src/dup.ts", text: 'createHash("sha256")' }],
      ALLOWED_HASH,
    );
    expect(offenders).toEqual(["packages/cli/src/dup.ts"]);
  });
});

describe("S-9 dead code stays a warning", () => {
  it("S-9 knip.json is the dead-code mechanism", () => {
    expect(existsSync(join(REPO_ROOT, "knip.json"))).toBe(true);
    expect(statSync(join(REPO_ROOT, "knip.json")).isFile()).toBe(true);
  });
});
