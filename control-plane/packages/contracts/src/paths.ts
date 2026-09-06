import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Locations of the normative pack. Resolved by walking up until `glt-specpack`
 * is found, so the code survives being moved inside the monorepo. It does not
 * survive the pack being renamed, which is the intent: the pack is a contract,
 * not a configurable input.
 */
function findRepoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "glt-specpack", "SPEC-PACK.md"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("glt-specpack not found above " + fileURLToPath(import.meta.url));
}

export const REPO_ROOT = findRepoRoot();
export const PACK_ROOT = join(REPO_ROOT, "glt-specpack");

export const PACK = {
  schemas: join(PACK_ROOT, "contracts", "schemas"),
  examples: join(PACK_ROOT, "contracts", "examples"),
  propagationMatrix: join(PACK_ROOT, "contracts", "propagation", "propagation-matrix.yaml"),
  eventRegistry: join(PACK_ROOT, "contracts", "events", "event-registry.yaml"),
  registryBundle: join(PACK_ROOT, "registry", "glt-controlplane.yaml"),
  boundaries: join(PACK_ROOT, "registry", "boundaries"),
  parameters: join(PACK_ROOT, "parameters"),
  authorityMap: join(PACK_ROOT, "trust", "authority-map.yaml"),
  bootstrapManifest: join(PACK_ROOT, "trust", "bootstrap-manifest.yaml"),
  releasePolicy: join(PACK_ROOT, "trust", "release-policy.yaml"),
  seedKeys: join(PACK_ROOT, "trust", "seed-public-keys"),
  docs: join(PACK_ROOT, "docs"),
} as const;

/** Schema `$id` prefix. Refs between schemas resolve against it, not against disk. */
export const SCHEMA_ID_PREFIX = "https://glt.dev/schemas/v1alpha1/";
