import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PACK,
  createValidator,
  defaultValidatePaths,
  listBoundaryManifests,
  listContractExamples,
  loadDocument,
  loadYaml,
  resolveSchemaName,
  validateAgainst,
} from "@glt/contracts";
import { run } from "@glt/cli";

const ajv = createValidator();

function failuresOf(path: string) {
  const doc = loadDocument(path);
  const schema = resolveSchemaName(path, doc);
  if (schema === undefined) {
    throw new Error(`cannot infer schema for ${path}`);
  }
  return { schema, errors: validateAgainst(ajv, schema, doc) };
}

describe("schema fixtures and pack artifacts", () => {
  it("S-4 every pack schema compiles in ajv strict mode", () => {
    const names = readdirSync(PACK.schemas)
      .filter((f) => f.endsWith(".schema.json"))
      .map((f) => f.replace(".schema.json", ""));
    for (const name of names) {
      expect(
        ajv.getSchema(`https://glt.dev/schemas/v1alpha1/${name}.schema.json`),
        name,
      ).toBeTruthy();
    }
  });

  it("PROTO-04 valid, boundary and golden node fixtures pass their schemas", () => {
    const offenders: string[] = [];
    for (const example of listContractExamples()) {
      if (example.bucket === "invalid") continue;
      const { schema, errors } = failuresOf(example.absolutePath);
      if (schema !== "node" && schema !== "registry-entry" && schema !== "snapshot") continue;
      if (errors.length > 0) {
        offenders.push(
          `${example.absolutePath} [${schema}]: ${errors.map((e) => e.message).join("; ")}`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it("PROTO-06 an edge missing propagation is rejected", () => {
    const path = join(PACK.examples, "invalid", "edge-missing-propagation.json");
    const { schema, errors } = failuresOf(path);
    expect(schema).toBe("edge");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("valid fixtures pass and invalid fixtures fail", () => {
    const unexpected: string[] = [];
    for (const example of listContractExamples()) {
      const { errors } = failuresOf(example.absolutePath);
      const shouldPass = example.bucket !== "invalid";
      if (shouldPass && errors.length > 0) {
        unexpected.push(`expected valid: ${example.absolutePath}`);
      }
      if (!shouldPass && errors.length === 0) {
        unexpected.push(`expected invalid: ${example.absolutePath}`);
      }
    }
    expect(unexpected).toEqual([]);
  });

  it("registry, boundary manifest, matrix and event registry are schema-valid", () => {
    const docs = [
      { path: PACK.registryBundle, name: "registry-bundle" as const },
      { path: PACK.propagationMatrix, name: "propagation-matrix" as const },
      { path: PACK.eventRegistry, name: "event-registry" as const },
      ...listBoundaryManifests().map((path) => ({ path, name: "boundary-manifest" as const })),
    ];
    for (const doc of docs) {
      expect(validateAgainst(ajv, doc.name, loadYaml(doc.path)), doc.path).toEqual([]);
    }
  });

  it("glt validate accepts the committed pack", async () => {
    const result = await run(["validate", "-o", "json"]);
    expect(result.code).toBe(0);
    const report = JSON.parse(result.stdout) as {
      failures: unknown[];
      coverage: { value: unknown; metric: string };
    };
    expect(report.failures).toEqual([]);
    expect(typeof report.coverage.value).toBe("number");
    expect(report.coverage.metric).toBe("glt_structural_coverage");
  });

  it("glt validate rejects an invalid fixture with exit 2", async () => {
    const path = join(PACK.examples, "invalid", "registry-entry-bad-id.json");
    const result = await run(["validate", path, "-o", "json"]);
    expect(result.code).toBe(2);
    expect(JSON.parse(result.stdout).failures.length).toBeGreaterThan(0);
  });

  it("default validate targets skip invalid fixtures", () => {
    const hit = defaultValidatePaths().filter((p) =>
      p.replaceAll("\\", "/").includes("/invalid/"),
    );
    expect(hit).toEqual([]);
  });
});
