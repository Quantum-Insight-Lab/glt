import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

/**
 * The single YAML/JSON reader (S-4). Line endings are normalized so that a
 * checkout on Windows and one on Linux produce identical parse input — the same
 * reason .gitattributes pins eol=lf, since source digests are byte-based.
 */
export function readText(path: string): string {
  return readFileSync(path, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

export function loadYaml<T = unknown>(path: string): T {
  return parseYaml(readText(path)) as T;
}

export function loadJson<T = unknown>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

/** Dispatches on extension. Used where an artifact may be authored in either form. */
export function loadDocument<T = unknown>(path: string): T {
  return /\.ya?ml$/.test(path) ? loadYaml<T>(path) : loadJson<T>(path);
}
