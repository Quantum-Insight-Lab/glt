/**
 * S-4 census: the mechanism table in AGENTS.md is the registry; this module
 * parses it and checks a provided file set for a second sha256 digest.
 */

export interface MechanismRow {
  readonly task: string;
  readonly mechanism: string;
  readonly lives: string;
}

export function parseMechanismRegistry(agentsMd: string): MechanismRow[] {
  const heading = agentsMd.indexOf("## Реестр механизмов");
  if (heading < 0) return [];
  const rest = agentsMd.slice(heading);
  const next = rest.indexOf("\n## ", 1);
  const section = next < 0 ? rest : rest.slice(0, next);
  const rows: MechanismRow[] = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    const task = cells[0];
    const mechanism = cells[1];
    const lives = cells[2];
    if (task === undefined || mechanism === undefined || lives === undefined) continue;
    if (task === "Задача" || task.startsWith("---") || task.length === 0) continue;
    rows.push({ task, mechanism, lives });
  }
  return rows;
}

export function listedPaths(row: MechanismRow): string[] {
  return [...row.lives.matchAll(/`([^`]+)`/g)].flatMap((m) => (m[1] === undefined ? [] : [m[1]]));
}

const SHA256_HASH_CALL = /createHash\(\s*["'`]sha256["'`]\s*\)/;

/** Paths of files that hash with sha256 outside the allowed digest module. */
export function extraSha256HashCalls(
  files: readonly { path: string; text: string }[],
  allowedPathSuffix: string,
): string[] {
  const allowed = allowedPathSuffix.replaceAll("\\", "/");
  return files.flatMap((file) => {
    const path = file.path.replaceAll("\\", "/");
    if (path.endsWith(allowed)) return [];
    return SHA256_HASH_CALL.test(file.text) ? [file.path] : [];
  });
}
