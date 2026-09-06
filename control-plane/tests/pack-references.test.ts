import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, PACK_ROOT, loadYaml } from "@glt/contracts";

/**
 * Every artifact the bootstrap manifest declares must exist on disk.
 *
 * This is the check that survives a fresh clone. Comparing generated modules
 * against schemas cannot detect a deleted schema, because the generator
 * enumerates the pack and the counts always agree afterwards. A manifest entry,
 * by contrast, is a written claim about a specific file — delete the file and
 * the claim becomes false.
 *
 * Manifest paths are relative to the pack root, not to the repository root.
 * That differs from SourceRef, whose paths are repository-relative because a
 * SourceRef names its repository explicitly and a manifest does not.
 */
interface BootstrapManifest {
  spec: {
    trust_root: { key_id: string };
    trusted_schemas: string[];
    trusted_registry: { path: string };
    trusted_propagation_matrix: { path: string };
    trusted_event_registry: { path: string };
    golden_fixtures: string[];
  };
}

const manifest = loadYaml<BootstrapManifest>(PACK.bootstrapManifest);
const spec = manifest.spec;

const missing = (paths: readonly string[]) =>
  paths.filter((p) => !existsSync(join(PACK_ROOT, p)));

describe("bootstrap manifest references resolve", () => {
  it("every trusted schema exists", () => {
    expect(missing(spec.trusted_schemas)).toEqual([]);
  });

  it("every golden fixture exists", () => {
    expect(missing(spec.golden_fixtures)).toEqual([]);
  });

  it("registry, matrix and event registry exist", () => {
    expect(
      missing([
        spec.trusted_registry.path,
        spec.trusted_propagation_matrix.path,
        spec.trusted_event_registry.path,
      ]),
    ).toEqual([]);
  });

  it("the declared trust root has a key file", () => {
    const keys = readdirSync(PACK.seedKeys).filter((f) => f.endsWith(".pub"));
    expect(keys).toContain(`${spec.trust_root.key_id}.pub`);
  });
});
