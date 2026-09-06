import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PACK, createValidator, loadYaml, schemaId, validateAgainst } from "./index.ts";

const GENERATED = fileURLToPath(new URL("./generated/", import.meta.url));

const schemaStems = readdirSync(PACK.schemas)
  .filter((f) => f.endsWith(".schema.json"))
  .map((f) => f.replace(".schema.json", ""))
  .sort();

describe("generated types stay in sync with the pack", () => {
  it("every schema has a generated module", () => {
    const missing = schemaStems.filter((s) => !existsSync(join(GENERATED, `${s}.ts`)));
    expect(missing).toEqual([]);
  });

  it("no generated module exists without a schema", () => {
    const generated = readdirSync(GENERATED)
      .filter((f) => f.endsWith(".ts") && f !== "index.ts" && f !== "events.ts")
      .map((f) => f.replace(".ts", ""))
      .sort();
    expect(generated).toEqual(schemaStems);
  });
});

describe("the single JSON Schema validator", () => {
  const ajv = createValidator();

  it("compiles all schemas in ajv strict mode", () => {
    for (const stem of schemaStems) {
      expect(ajv.getSchema(schemaId(stem as never)), stem).toBeTruthy();
    }
  });

  it("accepts the registry bundle", () => {
    const bundle = loadYaml(PACK.registryBundle);
    expect(validateAgainst(ajv, "registry-bundle", bundle)).toEqual([]);
  });

  it("accepts the propagation matrix", () => {
    expect(validateAgainst(ajv, "propagation-matrix", loadYaml(PACK.propagationMatrix))).toEqual(
      [],
    );
  });

  it("accepts the event registry", () => {
    expect(validateAgainst(ajv, "event-registry", loadYaml(PACK.eventRegistry))).toEqual([]);
  });

  it("rejects a document that violates its schema", () => {
    const failures = validateAgainst(ajv, "registry-bundle", { apiVersion: "wrong" });
    expect(failures.length).toBeGreaterThan(0);
  });
});
