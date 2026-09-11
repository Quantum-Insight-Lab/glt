import { intendedSnapshotExtras } from "@glt/collectors";
import { compileSnapshotFromPaths, renderCompiledSnapshot } from "@glt/snapshot";
import { ExitCode, isIntendedBoundaryRef } from "@glt/domain";
import type { Writer } from "./output.ts";

export interface CompileSnapshotCliOptions {
  readonly registry?: string;
  readonly boundary?: string;
  readonly matrix?: string;
  readonly asOf?: string;
}

export function runCompileSnapshot(
  writer: Writer,
  options: CompileSnapshotCliOptions = {},
): number {
  try {
    const snapshot = compileSnapshotFromPaths({
      ...(options.registry !== undefined ? { registry: options.registry } : {}),
      ...(options.boundary !== undefined ? { boundary: options.boundary } : {}),
      ...(options.matrix !== undefined ? { matrix: options.matrix } : {}),
      ...(options.asOf !== undefined ? { asOf: options.asOf } : {}),
      ...(isIntendedBoundaryRef(options.boundary) ? intendedSnapshotExtras() : {}),
    });
    writer.artifact(snapshot, renderCompiledSnapshot);
    return ExitCode.Success;
  } catch (error) {
    return writer.fail(error);
  }
}
