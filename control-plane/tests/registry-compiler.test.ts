import { describe, expect, it } from "vitest";
import { run } from "@glt/cli";
import {
  GltError,
  compileRegistry,
  resolveAlias,
  type CompiledRegistry,
  type RegistryEntryView,
} from "@glt/domain";
import { compileRegistryFromPaths } from "@glt/registry";

function asError(run: () => unknown): GltError {
  try {
    run();
  } catch (error) {
    if (error instanceof GltError) return error;
    throw error;
  }
  throw new Error("expected GltError");
}

const entry = (
  id: string,
  aliases: readonly string[],
  spec: unknown = { kind: "node" },
  revision = 1,
): RegistryEntryView => ({
  id,
  revision,
  namespace: "glt.controlplane",
  aliases,
  spec,
});

const aligned = {
  boundary: "glt.bootstrap-slice@1",
  version: "0.2.0",
  namespace: "glt.controlplane",
  boundaryNodes: ["a", "b"],
  boundaryEdges: ["e1"],
  edges: [{ id: "e1", from: "a", to: "b" }],
};

describe("registry compiler aliases and revisions", () => {
  it("PROTO-01 one alias in one namespace and version maps to at most one id", () => {
    const error = asError(() =>
      compileRegistry({
        ...aligned,
        entries: [entry("a", ["REG"]), entry("b", ["REG"])],
      }),
    );
    expect(error.invariant).toBe("PROTO-01");
    expect(error.code).toBe(3);
    expect(error.refs).toEqual(["a", "b"]);
  });

  it("PROTO-01 NFC-equivalent aliases are the same alias", () => {
    const error = asError(() =>
      compileRegistry({
        ...aligned,
        entries: [entry("a", ["\u00e9"]), entry("b", ["e\u0301"])],
      }),
    );
    expect(error.invariant).toBe("PROTO-01");
  });

  it("INV-02 PROTO-02 unknown alias reports unknown, never a fallback id", () => {
    const compiled = compileRegistry({
      ...aligned,
      entries: [entry("a", ["REG"]), entry("b", ["COMP"])],
    });
    const error = asError(() => resolveAlias(compiled, "MISSING", "glt.controlplane", "0.2.0"));
    expect(error.invariant).toBe("PROTO-02");
    expect(error.message).toBe("unknown alias");
    expect(error.message).not.toContain("did you mean");
    expect(error.refs).not.toContain("a");
  });

  it("INV-02 PROTO-02 a wrong registry version is unknown, not another version's id", () => {
    const compiled = compileRegistry({
      ...aligned,
      entries: [entry("a", ["REG"]), entry("b", ["COMP"])],
    });
    const error = asError(() => resolveAlias(compiled, "REG", "glt.controlplane", "0.1.0"));
    expect(error.invariant).toBe("PROTO-02");
    expect(error.message).toBe("unknown alias");
  });

  it("INV-02 PROTO-02 ambiguous alias errors instead of picking the first", () => {
    const compiled: CompiledRegistry = {
      version: "0.2.0",
      namespace: "glt.controlplane",
      boundary: "glt.bootstrap-slice@1",
      entries: [entry("a", ["REG"]), entry("b", ["REG"])],
      edges: [],
      aliases: [
        { alias: "REG", namespace: "glt.controlplane", semantic_id: "a", revision: 1 },
        { alias: "REG", namespace: "glt.controlplane", semantic_id: "b", revision: 1 },
      ],
    };
    const error = asError(() => resolveAlias(compiled, "REG", "glt.controlplane", "0.2.0"));
    expect(error.invariant).toBe("PROTO-02");
    expect(error.message).toBe("ambiguous alias");
    expect(error.refs).toEqual(["a", "b"]);
  });

  it("PROTO-08 alias reassignment within a compatible registry version is rejected", () => {
    const error = asError(() =>
      compileRegistry({
        ...aligned,
        entries: [entry("a", ["REG"]), entry("b", ["COMP"])],
        previous: {
          version: "0.2.0",
          aliases: [
            { alias: "REG", namespace: "glt.controlplane", semantic_id: "old.entry", revision: 1 },
          ],
        },
      }),
    );
    expect(error.invariant).toBe("PROTO-08");
    expect(error.refs).toEqual(["old.entry", "a"]);
  });

  it("PROTO-08 a new registry version may move an alias", () => {
    const compiled = compileRegistry({
      ...aligned,
      entries: [entry("a", ["REG"]), entry("b", ["COMP"])],
      previous: {
        version: "0.1.0",
        aliases: [
          { alias: "REG", namespace: "glt.controlplane", semantic_id: "old.entry", revision: 1 },
        ],
      },
    });
    expect(resolveAlias(compiled, "REG", "glt.controlplane", "0.2.0").semantic_id).toBe("a");
  });

  it("PROTO-09 a semantic change without a revision bump is rejected", () => {
    const error = asError(() =>
      compileRegistry({
        ...aligned,
        entries: [
          entry("a", ["REG"], { kind: "node" }, 1),
          entry("a", ["REG"], { kind: "check" }, 1),
          entry("b", ["COMP"]),
        ],
      }),
    );
    expect(error.invariant).toBe("PROTO-09");
    expect(error.refs[0]).toBe("a");
  });

  it("bundle and boundary listing different node ids fail compilation", () => {
    const error = asError(() =>
      compileRegistry({
        ...aligned,
        boundaryNodes: ["a"],
        entries: [entry("a", ["REG"]), entry("b", ["COMP"])],
      }),
    );
    expect(error.code).toBe(2);
    expect(error.message).toBe("bundle and boundary manifest diverge");
    expect(error.refs).toContain("bundle:b");
  });

  it("PROTO-01 committed pack compiles and INV-02 resolves glyph aliases", () => {
    const compiled = compileRegistryFromPaths();
    expect(compiled.entries).toHaveLength(4);
    expect(compiled.edges).toHaveLength(3);
    const hit = resolveAlias(compiled, "⟁REG", "glt.controlplane", compiled.version);
    expect(hit.semantic_id).toBe("glt.controlplane.registry.entry");
    expect(hit.revision).toBe(1);
  });

  it("PROTO-01 glt compile registry succeeds on the committed pack", async () => {
    const result = await run(["compile", "registry", "-o", "json"]);
    expect(result.code).toBe(0);
    const compiled = JSON.parse(result.stdout) as CompiledRegistry;
    expect(compiled.aliases.length).toBe(4);
    expect(compiled.boundary).toBe("glt.bootstrap-slice@1");
  });
});
