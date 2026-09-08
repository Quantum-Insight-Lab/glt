import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { SCHEMA_NAMES, type SchemaName } from "./generated/schema-names.ts";
import { PACK } from "./paths.ts";

let cachedKindIndex: ReadonlyMap<string, SchemaName> | undefined;

function isSchemaName(name: string): name is SchemaName {
  return (SCHEMA_NAMES as readonly string[]).includes(name);
}

/** `kind` const on a schema → stem. Derived from the pack, not a second table. */
export function kindIndex(): ReadonlyMap<string, SchemaName> {
  if (cachedKindIndex !== undefined) return cachedKindIndex;
  const map = new Map<string, SchemaName>();
  for (const file of readdirSync(PACK.schemas).filter((f) => f.endsWith(".schema.json"))) {
    const schema = JSON.parse(readFileSync(join(PACK.schemas, file), "utf8")) as {
      properties?: { kind?: { const?: unknown } };
    };
    const kind = schema.properties?.kind?.const;
    const name = basename(file, ".schema.json");
    if (typeof kind === "string" && isSchemaName(name)) map.set(kind, name);
  }
  cachedKindIndex = map;
  return map;
}

export function resolveSchemaName(path: string, doc: unknown): SchemaName | undefined {
  if (doc !== null && typeof doc === "object" && "kind" in doc) {
    const kind = (doc as { kind: unknown }).kind;
    if (typeof kind === "string") {
      const mapped = kindIndex().get(kind);
      if (mapped !== undefined) return mapped;
    }
  }

  const stem = basename(path).replace(/\.(json|ya?ml)$/i, "");
  const names = [...SCHEMA_NAMES].sort((a, b) => b.length - a.length);
  const prefixed = names.find((n) => stem === n || stem.startsWith(`${n}-`));
  if (prefixed !== undefined) return prefixed;
  if (stem.includes("snapshot") && isSchemaName("snapshot")) return "snapshot";
  if (stem.includes("impact") && isSchemaName("impact-report")) return "impact-report";
  return undefined;
}
