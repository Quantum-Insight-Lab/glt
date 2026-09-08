import { readdirSync } from "node:fs";
import { join } from "node:path";
import { PACK } from "./paths.ts";
import { readText } from "./load.ts";

/**
 * T0 material. Loaded from `trust/seed-public-keys/*.pub` and nowhere else.
 * Key id is the file stem — the verifier must not ask the manifest which file
 * to open.
 */
export function loadSeedPublicKeys(
  dir: string = PACK.seedKeys,
): { keyId: string; pem: string }[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".pub"))
    .sort()
    .map((name) => ({
      keyId: name.slice(0, -".pub".length),
      pem: readText(join(dir, name)),
    }));
}
