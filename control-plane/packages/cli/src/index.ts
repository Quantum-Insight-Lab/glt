import { Command } from "commander";
import { ExitCode, usageError } from "@glt/domain";
import { COMMANDS, type CommandSpec } from "./commands.ts";
import { lintDocs, renderLintReport } from "./lint-docs.ts";
import { createWriter, defaultFormat, type OutputFormat, type Writer } from "./output.ts";
import { runVerify } from "./verify.ts";

export { COMMANDS, ALLOWED_CAPABILITIES, FORBIDDEN_COMMANDS } from "./commands.ts";
export type { CommandSpec, Capability } from "./commands.ts";
export { lintDocs, renderLintReport } from "./lint-docs.ts";
export type { Finding, FindingKind, LintReport } from "./lint-docs.ts";
export { verifyBootstrap } from "./verify.ts";

export interface RunResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** A command that this build actually implements. Returns its exit code. */
type Handler = (writer: Writer) => number;

/**
 * Implemented commands, keyed exactly as in cli.md. Everything absent from here
 * is declared but not built, and says so instead of pretending to succeed.
 */
const HANDLERS: Readonly<Record<string, Handler>> = {
  verify: (writer) => runVerify(writer),
  "lint docs": (writer) => {
    const report = lintDocs();
    writer.artifact(report, renderLintReport);
    // Exit 2 is "contract validation failure": the documents violate the
    // metadata contract. Distinct from 3, an invariant violation.
    return report.findings.length > 0 ? ExitCode.ContractInvalid : ExitCode.Success;
  },
};

/**
 * Builds the parser. Exported so S-10 can enumerate the registered command set
 * from the parser itself rather than from a list that could drift from it.
 */
export function buildProgram(writer: Writer, onExitCode?: (code: number) => void): Command {
  const program = new Command();

  program
    .name("glt")
    .description("GLT Control Plane. Read-only in v1: no command writes to the workspace.")
    .option("--registry <path>", "registry bundle")
    .option("--boundary <id>", "coverage boundary")
    .option("--matrix <path>", "propagation matrix")
    .option("--snapshot <path|id>", "snapshot to read")
    .option("--as-of <rfc3339>", "pinned snapshot time, truncated to whole seconds")
    .option("--max-depth <n>", "traversal limit")
    .option("-o, --output <json|text>", "output format")
    .option("--no-color", "disable ANSI styling")
    .option("-q, --quiet", "suppress progress on stderr")
    .option("-v, --verbose", "diagnostic detail on stderr")
    .exitOverride()
    .configureOutput({
      writeOut: (s) => writer.note(s.trimEnd()),
      writeErr: (s) => writer.note(s.trimEnd()),
    });

  // Subcommand groups declared in cli.md as `lint docs`, `compile snapshot`, ...
  const groups = new Map<string, Command>();
  const groupFor = (parent: string): Command => {
    const existing = groups.get(parent);
    if (existing) return existing;
    const cmd = program.command(parent).description(`${parent} subcommands`);
    groups.set(parent, cmd);
    return cmd;
  };

  for (const spec of COMMANDS) {
    const parts = spec.name.split(" ");
    const target = parts.length > 1 ? groupFor(parts[0]!) : program;
    const leaf = parts.length > 1 ? parts.slice(1).join(" ") : spec.name;
    const signature = spec.args ? `${leaf} ${spec.args}` : leaf;
    const handler = HANDLERS[spec.name];

    target
      .command(signature)
      .description(spec.summary)
      .action(() => {
        if (!handler) throw notAvailableYet(spec);
        onExitCode?.(handler(writer));
      });
  }

  return program;
}

function notAvailableYet(spec: CommandSpec) {
  return usageError(
    `glt ${spec.name} is declared but not implemented in this build; available from ${spec.availableFrom}`,
    [spec.availableFrom],
  );
}

export async function run(
  argv: readonly string[],
  env: { isTty: boolean } = { isTty: false },
): Promise<RunResult> {
  let stdout = "";
  let stderr = "";
  let code: number = ExitCode.Success;

  const explicit = readFormatFlag(argv);
  const writer = createWriter(
    { format: explicit ?? defaultFormat(env.isTty), quiet: argv.includes("--quiet") },
    { out: (s) => (stdout += s), err: (s) => (stderr += s) },
  );

  const program = buildProgram(writer, (c) => (code = c));
  try {
    await program.parseAsync(["node", "glt", ...argv]);
    return { code, stdout, stderr };
  } catch (error) {
    if (isCommanderExit(error)) {
      return { code: error.exitCode, stdout, stderr };
    }
    return { code: writer.fail(error), stdout, stderr };
  }
}

/** Read before parsing, because the format decides how a parse error is rendered. */
function readFormatFlag(argv: readonly string[]): OutputFormat | undefined {
  const i = argv.findIndex((a) => a === "-o" || a === "--output");
  const value = i >= 0 ? argv[i + 1] : undefined;
  return value === "json" || value === "text" ? value : undefined;
}

function isCommanderExit(error: unknown): error is { exitCode: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "exitCode" in error &&
    typeof (error as { exitCode: unknown }).exitCode === "number"
  );
}
