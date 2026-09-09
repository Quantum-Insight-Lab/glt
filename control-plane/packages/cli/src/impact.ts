import { computeImpactFromPaths, renderImpactReport } from "@glt/impact";
import { ExitCode, usageError } from "@glt/domain";
import type { Writer } from "./output.ts";

interface ImpactCliOptions {
  readonly registry?: string;
  readonly boundary?: string;
  readonly matrix?: string;
  readonly snapshot?: string;
  readonly asOf?: string;
  readonly maxDepth?: string;
}

export function runImpact(writer: Writer, options: ImpactCliOptions = {}): number {
  try {
    const report = computeImpactFromPaths({
      ...(options.registry !== undefined ? { registry: options.registry } : {}),
      ...(options.boundary !== undefined ? { boundary: options.boundary } : {}),
      ...(options.matrix !== undefined ? { matrix: options.matrix } : {}),
      ...(options.snapshot !== undefined ? { snapshot: options.snapshot } : {}),
      ...(options.asOf !== undefined ? { asOf: options.asOf } : {}),
      ...(options.maxDepth !== undefined ? { maxDepth: parseDepth(options.maxDepth) } : {}),
    });
    writer.artifact(report, renderImpactReport);
    return ExitCode.Success;
  } catch (error) {
    return writer.fail(error);
  }
}

function parseDepth(raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value)) throw usageError("invalid --max-depth", [raw]);
  return value;
}
