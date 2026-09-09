import { ExitCode, usageError } from "@glt/domain";
import { ioFromOptions, renderResolved, resolveRef } from "@glt/snapshot";
import type { Writer } from "./output.ts";

export interface ResolveCliOptions {
  readonly registry?: string;
  readonly boundary?: string;
}

export function runResolve(
  writer: Writer,
  ref: string | undefined,
  options: ResolveCliOptions = {},
): number {
  if (ref === undefined || ref.length === 0) {
    return writer.fail(usageError("glt resolve requires a ref"));
  }
  try {
    const resolved = resolveRef(ref, ioFromOptions(options));
    writer.artifact(resolved, renderResolved);
    return ExitCode.Success;
  } catch (error) {
    return writer.fail(error);
  }
}
