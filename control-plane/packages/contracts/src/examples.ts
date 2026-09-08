import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PACK } from "./paths.ts";

export type ExampleBucket = "valid" | "invalid" | "boundary" | "golden";

const BUCKETS: readonly ExampleBucket[] = ["valid", "invalid", "boundary", "golden"];

export interface ContractExample {
  readonly absolutePath: string;
  readonly bucket: ExampleBucket;
}

export function listContractExamples(): ContractExample[] {
  const out: ContractExample[] = [];
  for (const bucket of BUCKETS) {
    const dir = join(PACK.examples, bucket);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      if (!/\.(json|ya?ml)$/i.test(file)) continue;
      out.push({ absolutePath: join(dir, file), bucket });
    }
  }
  return out;
}

export function listBoundaryManifests(): string[] {
  return readdirSync(PACK.boundaries)
    .filter((f) => /\.ya?ml$/i.test(f))
    .sort()
    .map((f) => join(PACK.boundaries, f));
}

/** Pack artifacts `glt validate` checks when no paths are given. Invalid fixtures are excluded. */
export function defaultValidatePaths(): string[] {
  return [
    PACK.registryBundle,
    PACK.propagationMatrix,
    PACK.eventRegistry,
    ...listBoundaryManifests(),
    ...listContractExamples()
      .filter((e) => e.bucket !== "invalid")
      .map((e) => e.absolutePath),
  ];
}
