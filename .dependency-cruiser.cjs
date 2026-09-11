/**
 * Mechanism for S-1, S-2 and S-5 from glt-specpack/docs/SPEC/structural-invariants.md.
 *
 * The allowed import graph is declared here as an allowlist, not as a list of
 * prohibitions: a new edge requires editing this file in its own PR.
 *
 * Layer order (foundations first): contracts, domain, registry, snapshot,
 * collectors, impact, runner, audit, api, dashboard, cli.
 *
 * `cli` and `api` are composition roots. They wire packages together and
 * implement no domain logic, so they may reach any layer. The rest may only
 * reach layers declared below them.
 */
const P = "^control-plane/packages";

/** Core modules that perform I/O. `node:crypto` is deliberately absent — see S-1. */
const IO_CORE =
  "^(node:)?(fs|fs/promises|net|http|http2|https|child_process|dns|tls|dgram|cluster|worker_threads|readline|repl|inspector|v8|vm|process|os)$";

module.exports = {
  forbidden: [
    // ---------------------------------------------------------------- S-1
    {
      name: "s1-domain-no-io-core",
      comment:
        "S-1: domain performs no I/O. node:crypto is the single allowed exception, " +
        "because the alternative is a third-party dependency inside the bootstrap " +
        "verifier trust base.",
      severity: "error",
      from: { path: `${P}/domain` },
      to: { path: IO_CORE, dependencyTypes: ["core"] },
    },
    {
      name: "s1-domain-no-third-party",
      comment: "S-1: domain has no third-party dependencies. Trust base stays minimal.",
      severity: "error",
      from: { path: `${P}/domain` },
      to: { dependencyTypes: ["npm", "npm-dev", "npm-optional", "npm-peer", "npm-bundled"] },
    },
    {
      name: "s1-domain-no-siblings",
      comment: "S-1: domain depends on contracts only.",
      severity: "error",
      from: { path: `${P}/domain` },
      to: { path: `${P}/(?!(domain|contracts)/)` },
    },

    // ---------------------------------------------------------------- S-2
    {
      name: "s2-contracts-is-a-leaf",
      comment: "S-2: contracts is generated from schemas and depends on no sibling.",
      severity: "error",
      from: { path: `${P}/contracts` },
      to: { path: `${P}/(?!contracts/)` },
    },
    {
      name: "s2-registry-direction",
      comment: "S-2: registry may reach contracts and domain only.",
      severity: "error",
      from: { path: `${P}/registry` },
      to: { path: `${P}/(?!(registry|contracts|domain)/)` },
    },
    {
      name: "s2-snapshot-direction",
      comment: "S-2: snapshot may reach contracts, domain and registry.",
      severity: "error",
      from: { path: `${P}/snapshot` },
      to: { path: `${P}/(?!(snapshot|contracts|domain|registry)/)` },
    },
    {
      name: "s2-collectors-direction",
      comment: "S-2: collectors gather facts and make no policy decision.",
      severity: "error",
      from: { path: `${P}/collectors` },
      to: { path: `${P}/(?!(collectors|contracts|domain|registry|snapshot)/)` },
    },
    {
      name: "s2-impact-direction",
      comment: "S-2: impact may reach contracts, domain, registry, snapshot, collectors.",
      severity: "error",
      from: { path: `${P}/impact` },
      to: { path: `${P}/(?!(impact|contracts|domain|registry|snapshot|collectors)/)` },
    },
    {
      name: "s2-dashboard-reads-only",
      comment:
        "S-2 and S-5: dashboard is a read-only projection. It talks to the API and " +
        "never reaches a compiler or a store directly.",
      severity: "error",
      from: { path: `${P}/dashboard` },
      to: { path: `${P}/(?!(dashboard|contracts|api)/)` },
    },
    {
      name: "s2-api-no-dashboard",
      comment:
        "S-2: api is a composition root and may reach compilers, but not the " +
        "dashboard — that edge would cycle (dashboard → api → dashboard).",
      severity: "error",
      from: { path: `${P}/api` },
      to: { path: `${P}/dashboard` },
    },

    // ---------------------------------------------------------------- S-5
    {
      name: "s5-runner-no-registry-write",
      comment: "S-5: runner never writes to the registry.",
      severity: "error",
      from: { path: `${P}/runner` },
      to: { path: `${P}/registry` },
    },
    {
      name: "s5-audit-is-append-only",
      comment: "S-5: audit store depends on nothing that could rewrite its inputs.",
      severity: "error",
      from: { path: `${P}/audit` },
      to: { path: `${P}/(?!(audit|contracts|domain)/)` },
    },

    // ---------------------------------------------------------------- S-6
    {
      name: "s6-no-circular",
      comment: "S-6: the import graph is acyclic. Topology may contain cycles; imports may not.",
      severity: "error",
      from: {},
      to: { circular: true },
    },

    // -------------------------------------------------------- hygiene
    {
      name: "no-orphans",
      severity: "warn",
      from: { orphan: true, pathNot: ["\\.d\\.ts$", "(^|/)tsconfig\\.json$"] },
      to: {},
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.ts$" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: [".ts", ".js", ".json"],
      mainFields: ["module", "main", "types"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
