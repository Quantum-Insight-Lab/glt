import { readdirSync } from "node:fs";
import { join } from "node:path";
import { loadYaml } from "./load.ts";
import { PACK } from "./paths.ts";

export function loadParameterCards(): unknown[] {
  return readdirSync(PACK.parameters)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => loadYaml(join(PACK.parameters, f)));
}
