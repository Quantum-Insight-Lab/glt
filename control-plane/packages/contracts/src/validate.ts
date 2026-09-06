import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { PACK, SCHEMA_ID_PREFIX } from "./paths.ts";

/**
 * The single JSON Schema validator (S-4). Strict mode is on: a schema that ajv
 * considers sloppy is a defect in the schema, not a reason to relax the flag.
 */
export function createValidator(): Ajv2020 {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);

  for (const file of readdirSync(PACK.schemas).filter((f) => f.endsWith(".schema.json"))) {
    const schema = JSON.parse(readFileSync(join(PACK.schemas, file), "utf8")) as {
      $id?: string;
    };
    ajv.addSchema(schema, schema.$id ?? SCHEMA_ID_PREFIX + basename(file));
  }

  return ajv;
}

/** Artifact kinds addressable by schema stem, e.g. `node`, `snapshot`. */
export type SchemaName =
  | "action-plan"
  | "action-spec"
  | "audit-record"
  | "edge"
  | "event-registry"
  | "impact-report"
  | "node"
  | "propagation-matrix"
  | "registry-bundle"
  | "registry-entry"
  | "snapshot"
  | "source-ref";

export function schemaId(name: SchemaName): string {
  return `${SCHEMA_ID_PREFIX}${name}.schema.json`;
}

export function getValidator(ajv: Ajv2020, name: SchemaName): ValidateFunction {
  const validate = ajv.getSchema(schemaId(name));
  if (!validate) throw new Error(`schema not registered: ${name}`);
  return validate;
}

export interface ValidationFailure {
  readonly path: string;
  readonly message: string;
}

/** Returns an empty array when the document conforms. */
export function validateAgainst(
  ajv: Ajv2020,
  name: SchemaName,
  doc: unknown,
): readonly ValidationFailure[] {
  const validate = getValidator(ajv, name);
  if (validate(doc)) return [];
  return (validate.errors ?? []).map((e) => ({
    path: e.instancePath || "/",
    message: `${e.message ?? "invalid"} ${JSON.stringify(e.params)}`.trim(),
  }));
}
