import { readdirSync } from "node:fs";
import { join } from "node:path";
import { PACK, REPO_ROOT, readText } from "@glt/contracts";
import {
  parseDeferrals,
  parseRegistryIds,
  parseTestIds,
  reconcileCoverage,
  type CoverageReport,
} from "@glt/domain";

/** Compose S-7: read the three registries and test names, then reconcile. */
export function structuralCoverage(): CoverageReport {
  const proto = readText(join(PACK.docs, "SPEC", "invariants.md"));
  const inv = readText(join(PACK.docs, "PDA", "04-invariants.md"));
  const structural = readText(join(PACK.docs, "SPEC", "structural-invariants.md"));
  const registry = parseRegistryIds(proto, inv, structural);
  const deferrals = parseDeferrals(structural);
  const testIds = listTestFiles(join(REPO_ROOT, "control-plane")).flatMap((file) =>
    parseTestIds(readText(file)),
  );
  return reconcileCoverage({ registry, testIds, deferrals });
}

function listTestFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name === "generated" ? [] : listTestFiles(path);
    }
    return entry.name.endsWith(".test.ts") ? [path] : [];
  });
}
