/**
 * Generates TypeScript from the normative contracts. Nothing here is authored
 * by hand: hand-writing a type that a schema already defines creates a second
 * source for one fact, which normativity-rules.md forbids.
 *
 * Outputs land in src/generated/ and are gitignored. A test asserts they are in
 * sync with the pack, so drift fails the build instead of being discovered by a
 * confused reader.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileFromFile } from "json-schema-to-typescript";
import { parse as parseYaml } from "yaml";
import { PACK, SCHEMA_ID_PREFIX } from "../src/paths.ts";

const OUT_DIR = fileURLToPath(new URL("../src/generated/", import.meta.url));

const BANNER = [
  "/* eslint-disable */",
  "// GENERATED FILE — do not edit.",
  "// Source: glt-specpack/contracts/. Regenerate with `pnpm gen`.",
  "",
].join("\n");

/** `registry-entry.schema.json` -> `registry-entry` */
const stem = (file: string) => basename(file, ".schema.json");

/** `registry-entry` -> `RegistryEntry` */
const pascal = (s: string) =>
  s
    .split(/[-_.]/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join("");

async function generateSchemaTypes(): Promise<Map<string, string>> {
  const files = readdirSync(PACK.schemas)
    .filter((f) => f.endsWith(".schema.json"))
    .sort();

  /** stem -> exported root type name */
  const roots = new Map<string, string>();

  for (const file of files) {
    const abs = join(PACK.schemas, file);
    const schema = JSON.parse(readFileSync(abs, "utf8")) as { title?: string };
    const rootName = schema.title ?? pascal(stem(file));

    const ts = await compileFromFile(abs, {
      bannerComment: BANNER,
      additionalProperties: false,
      declareExternallyReferenced: true,
      enableConstEnums: false,
      style: { singleQuote: false },
      cwd: PACK.schemas,
      $refOptions: {
        resolve: {
          // Refs between schemas are absolute https:// URLs derived from $id.
          // Fetching them would make codegen depend on a live domain; they are
          // mapped back onto disk instead.
          glt: {
            order: 1,
            canRead: (file: { url: string }) => file.url.startsWith(SCHEMA_ID_PREFIX),
            read: (file: { url: string }) =>
              readFileSync(join(PACK.schemas, basename(file.url)), "utf8"),
          },
        },
      },
    });

    writeFileSync(join(OUT_DIR, `${stem(file)}.ts`), ts);
    roots.set(stem(file), rootName);
  }

  return roots;
}

function generateEventConstants(): number {
  const doc = parseYaml(readFileSync(PACK.eventRegistry, "utf8")) as {
    metadata: { registry_version: string };
    spec: { events: { type: string; schema_version: number; context: string }[] };
  };

  const entries = doc.spec.events.map((e) => {
    // glt.snapshot.compiled -> SnapshotCompiled
    const name = e.type
      .split(".")
      .slice(1)
      .map((p) => p[0]!.toUpperCase() + p.slice(1))
      .join("");
    return { name, type: e.type, version: e.schema_version, context: e.context };
  });

  const dupes = entries.map((e) => e.name).filter((n, i, a) => a.indexOf(n) !== i);
  if (dupes.length > 0) {
    throw new Error(`event name collision after PascalCase: ${dupes.join(", ")}`);
  }

  const lines = [
    BANNER,
    `/** Event registry version ${doc.metadata.registry_version}. */`,
    `export const EVENT_REGISTRY_VERSION = "${doc.metadata.registry_version}" as const;`,
    "",
    "/**",
    " * The only permitted source of event names (S-3). A string literal event",
    " * name anywhere in the codebase is a defect, not a shortcut.",
    " */",
    "export const EventType = {",
    ...entries.map((e) => `  ${e.name}: "${e.type}",`),
    "} as const;",
    "",
    "export type EventType = (typeof EventType)[keyof typeof EventType];",
    "",
    "export const EVENT_SCHEMA_VERSION: Record<EventType, number> = {",
    ...entries.map((e) => `  "${e.type}": ${e.version},`),
    "};",
    "",
    "export const EVENT_CONTEXT: Record<EventType, string> = {",
    ...entries.map((e) => `  "${e.type}": "${e.context}",`),
    "};",
    "",
  ];

  writeFileSync(join(OUT_DIR, "events.ts"), lines.join("\n"));
  return entries.length;
}

/**
 * The list of schema names is generated, not hand-written.
 *
 * It used to be a union typed by hand in validate.ts, which made it a second
 * source for one fact: a schema could be deleted while its name lived on in the
 * type, and nothing failed. Generated, a removed schema drops out of the union
 * and every reference to it stops compiling — which typecheck catches on a
 * fresh clone, where a file-count comparison cannot.
 */
function generateSchemaNames(roots: Map<string, string>): void {
  const names = [...roots.keys()].sort();
  const lines = [
    BANNER,
    "/** Schema stems present in the pack. Reference a removed one and typecheck fails. */",
    "export const SCHEMA_NAMES = [",
    ...names.map((n) => `  "${n}",`),
    "] as const;",
    "",
    "export type SchemaName = (typeof SCHEMA_NAMES)[number];",
    "",
  ];
  writeFileSync(join(OUT_DIR, "schema-names.ts"), lines.join("\n"));
}

function generateIndex(roots: Map<string, string>): void {
  const lines = [
    BANNER,
    'export * from "./events.ts";',
    'export * from "./schema-names.ts";',
    "",
    ...[...roots.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, root]) => `export type { ${root} } from "./${file}.ts";`),
    "",
  ];
  writeFileSync(join(OUT_DIR, "index.ts"), lines.join("\n"));
}

// Wipe first. A stale module left behind from a deleted schema would otherwise
// survive regeneration and quietly stay exported.
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const roots = await generateSchemaTypes();
const eventCount = generateEventConstants();
generateSchemaNames(roots);
generateIndex(roots);

console.log(`generated ${roots.size} schema modules, ${eventCount} event constants`);
