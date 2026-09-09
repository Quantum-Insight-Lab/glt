import { compileRegistryFromPaths } from "@glt/registry";
import { ExitCode, type CompiledRegistry } from "@glt/domain";
import type { Writer } from "./output.ts";

export interface CompileRegistryOptions {
  readonly registry?: string;
  readonly boundary?: string;
}

export function runCompileRegistry(writer: Writer, options: CompileRegistryOptions = {}): number {
  try {
    const compiled = compileRegistryFromPaths({
      ...(options.registry !== undefined ? { bundlePath: options.registry } : {}),
      ...(options.boundary !== undefined ? { boundaryRef: options.boundary } : {}),
    });
    writer.artifact(compiled, renderCompiledRegistry);
    return ExitCode.Success;
  } catch (error) {
    return writer.fail(error);
  }
}

export function renderCompiledRegistry(compiled: CompiledRegistry): string {
  return [
    `registry ${compiled.version} ${compiled.namespace}`,
    `boundary ${compiled.boundary}`,
    `entries ${String(compiled.entries.length)} edges ${String(compiled.edges.length)} aliases ${String(compiled.aliases.length)}`,
  ].join("\n");
}
