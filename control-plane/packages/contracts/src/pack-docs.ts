import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import { PACK_ROOT } from "./paths.ts";
import { readText } from "./load.ts";

/**
 * Reading of the pack's markdown documents.
 *
 * Frontmatter is machine-load-bearing: the linters read it, and from DEV-09 the
 * intended plane of the meta-graph is built from it. A markdown formatter can
 * destroy it silently — that has already happened once, turning `id:` into a
 * heading and dropping the closing delimiter — so parsing reports the failure
 * instead of skipping the file.
 */

export interface Frontmatter {
  readonly id?: string;
  readonly owner?: string;
  readonly normativity?: string;
  readonly status?: string;
  readonly depends_on?: string[];
  readonly source_refs?: Record<string, unknown>[];
  readonly spec_refs?: string[];
  readonly [key: string]: unknown;
}

export interface PackDoc {
  /** Path relative to the pack root, forward slashes. */
  readonly path: string;
  /** Absolute path on disk. */
  readonly absolutePath: string;
  readonly frontmatter: Frontmatter | undefined;
  /** Why frontmatter is undefined, when it is. */
  readonly parseError: string | undefined;
  /** Document text with the frontmatter block removed. */
  readonly body: string;
}

const FRONTMATTER_START = "---\n";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Every markdown document the pack owns, including non-normative examples. */
export function packDocPaths(): string[] {
  const roots = [join(PACK_ROOT, "docs"), join(PACK_ROOT, "examples")];
  return roots
    .filter((r) => {
      try {
        return statSync(r).isDirectory();
      } catch {
        return false;
      }
    })
    .flatMap(walk)
    .filter((p) => p.endsWith(".md"))
    .sort();
}

export interface ParsedFrontmatter {
  readonly frontmatter: Frontmatter | undefined;
  readonly parseError: string | undefined;
  readonly body: string;
}

/**
 * Pure so the failure modes can be tested directly. The one that actually
 * occurred: a formatter turned `id:` into `## id:` and dropped the closing
 * delimiter, and the document silently left the graph.
 */
export function parseFrontmatter(text: string): ParsedFrontmatter {
  if (!text.startsWith(FRONTMATTER_START)) {
    return {
      frontmatter: undefined,
      parseError: "документ не начинается с блока frontmatter",
      body: text,
    };
  }

  const end = text.indexOf("\n---", FRONTMATTER_START.length);
  if (end === -1) {
    return {
      frontmatter: undefined,
      parseError: "блок frontmatter не закрыт разделителем ---",
      body: text,
    };
  }

  const raw = text.slice(FRONTMATTER_START.length, end);
  const body = text.slice(end + 4);

  try {
    const parsed = parseYaml(raw) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        frontmatter: undefined,
        parseError: "frontmatter не является YAML-отображением",
        body,
      };
    }
    return { frontmatter: parsed as Frontmatter, parseError: undefined, body };
  } catch (error) {
    return {
      frontmatter: undefined,
      parseError: `YAML: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
      body,
    };
  }
}

export function readPackDoc(absolutePath: string): PackDoc {
  return {
    path: relative(PACK_ROOT, absolutePath).replace(/\\/g, "/"),
    absolutePath,
    ...parseFrontmatter(readText(absolutePath)),
  };
}

export function loadPackDocs(): PackDoc[] {
  return packDocPaths().map(readPackDoc);
}

/**
 * Relative markdown link targets in a document body, excluding anchors and
 * external URLs. Image links count: a missing image is a broken reference too.
 */
export function bodyLinkTargets(body: string): string[] {
  const targets = new Set<string>();
  for (const match of body.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1]!;
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const withoutAnchor = target.split("#")[0]!;
    if (withoutAnchor.length > 0) targets.add(withoutAnchor);
  }
  return [...targets].sort();
}
