/**
 * The command surface, declared as data so that S-10 can compare it against
 * glt-specpack/docs/SPEC/cli.md by set equality.
 *
 * v1 exposes exactly the allowed capabilities. `commit`, `push`, `deploy`,
 * `self-upgrade` and `self-write` are not commands, not flags and not hidden
 * subcommands. Adding one is a contract violation, not a feature.
 */

/** The only capabilities v1 may expose. */
export const ALLOWED_CAPABILITIES = [
  "inventory",
  "validate",
  "compile",
  "typecheck",
  "test",
  "health",
] as const;

export type Capability = (typeof ALLOWED_CAPABILITIES)[number];

export interface CommandSpec {
  /** Full command path as written in cli.md, arguments stripped. */
  readonly name: string;
  readonly capability: Capability;
  /** DEV step that makes this command functional. */
  readonly availableFrom: string;
  readonly summary: string;
  /** Positional argument signature, as declared in cli.md. */
  readonly args?: string;
}

export const COMMANDS: readonly CommandSpec[] = [
  {
    name: "verify",
    capability: "validate",
    availableFrom: "glt.dev.02",
    summary: "Bootstrap trust: T0 keys, manifest signature, schemas, golden fixtures, invariants",
  },
  {
    name: "validate",
    capability: "validate",
    availableFrom: "glt.dev.04",
    args: "[path...]",
    summary: "Schema-validate registry, boundary, matrix and fixtures",
  },
  {
    name: "lint docs",
    capability: "validate",
    availableFrom: "glt.dev.03",
    summary: "Frontmatter contract, depends_on acyclicity, source_refs existence",
  },
  {
    name: "lint authority",
    capability: "validate",
    availableFrom: "glt.dev.05",
    summary: "Authority map enforcement, one owner per fact class",
  },
  {
    name: "compile registry",
    capability: "compile",
    availableFrom: "glt.dev.06",
    summary: "Resolve aliases, emit compiled registry",
  },
  {
    name: "compile snapshot",
    capability: "compile",
    availableFrom: "glt.dev.08",
    summary: "Emit an immutable topology snapshot",
  },
  {
    name: "resolve",
    capability: "inventory",
    availableFrom: "glt.dev.07",
    args: "<ref>",
    summary: "Resolve an alias, node id or SourceRef",
  },
  {
    name: "inventory",
    capability: "inventory",
    availableFrom: "glt.dev.06",
    summary: "List entries, nodes and edges",
  },
  {
    name: "impact",
    capability: "inventory",
    availableFrom: "glt.dev.10",
    summary: "Change impact or incident propagation report",
  },
  {
    name: "health",
    capability: "health",
    availableFrom: "glt.dev.16",
    summary: "Control plane self health and snapshot freshness",
  },
  {
    name: "typecheck",
    capability: "typecheck",
    availableFrom: "wave 4",
    summary: "Delegated build action, through the runner",
  },
  {
    name: "test",
    capability: "test",
    availableFrom: "wave 4",
    summary: "Delegated build action, through the runner",
  },
];

/** Commands that must never exist, in any form. */
export const FORBIDDEN_COMMANDS = [
  "commit",
  "push",
  "deploy",
  "self-upgrade",
  "self-write",
] as const;
