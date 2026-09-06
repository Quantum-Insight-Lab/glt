import { GltError, type ExitCode } from "@glt/domain";

/**
 * The single output writer (S-4).
 *
 * stdout carries the artifact and nothing else — with `-o json` it is exactly
 * one JSON document. stderr carries progress, warnings and diagnostics. Piping
 * stdout into another tool never requires filtering.
 */
export type OutputFormat = "json" | "text";

export interface OutputOptions {
  readonly format: OutputFormat;
  readonly quiet: boolean;
}

export interface Writer {
  /** Emits the artifact. Called at most once per command. */
  artifact(value: unknown, renderText: (value: never) => string): void;
  /** Diagnostics and progress. Never stdout. */
  note(message: string): void;
  warn(message: string): void;
  fail(error: unknown): ExitCode;
}

/** `--output` defaults to json when stdout is not a TTY, so pipes stay parseable. */
export function defaultFormat(isTty: boolean): OutputFormat {
  return isTty ? "text" : "json";
}

export function createWriter(
  options: OutputOptions,
  streams: { out: (s: string) => void; err: (s: string) => void },
): Writer {
  return {
    artifact(value, renderText) {
      const text =
        options.format === "json"
          ? JSON.stringify(value, null, 2)
          : renderText(value as never);
      streams.out(text + "\n");
    },

    note(message) {
      if (options.quiet) return;
      streams.err(message + "\n");
    },

    warn(message) {
      streams.err(
        options.format === "json"
          ? JSON.stringify({ level: "warn", message }) + "\n"
          : `warning: ${message}\n`,
      );
    },

    fail(error) {
      if (error instanceof GltError) {
        streams.err(
          options.format === "json"
            ? JSON.stringify(error.toJSON()) + "\n"
            : formatError(error) + "\n",
        );
        return error.code;
      }
      const message = error instanceof Error ? error.message : String(error);
      streams.err(
        options.format === "json"
          ? JSON.stringify({ code: 70, message }) + "\n"
          : `internal error: ${message}\n`,
      );
      return 70;
    },
  };
}

function formatError(error: GltError): string {
  const head = error.invariant ? `${error.invariant}: ${error.message}` : error.message;
  return error.refs.length > 0 ? `${head}\n  refs: ${error.refs.join(", ")}` : head;
}
