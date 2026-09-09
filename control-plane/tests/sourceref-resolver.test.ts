import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, REPO_ROOT, readText } from "@glt/contracts";
import {
  GltError,
  applyJsonPointer,
  classifyResolveInput,
  compileRegistry,
  digestOfUtf8,
  parseSelector,
  uniqueLocator,
  type CompiledRegistry,
  type RegistryEntryView,
} from "@glt/domain";
import { resolveRef } from "@glt/snapshot";
import { run } from "@glt/cli";

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
  boundaryNodes: ["foo", "bar"],
  boundaryEdges: ["e1"],
  edges: [{ id: "e1", from: "foo", to: "bar" }],
};

const REGISTRY_MD = "glt-specpack/docs/SPEC/registry.md";

describe("DEV-07 SourceRef resolver", () => {
  it("resolves path from the repository root, not the pack root", () => {
    const hit = resolveRef(REGISTRY_MD);
    expect(hit.kind).toBe("source_ref");
    if (hit.kind !== "source_ref") return;
    expect(hit.path).toBe(REGISTRY_MD);
    expect(hit.usable_as).toBe("navigation");
    expect(hit.digest.startsWith("sha256:")).toBe(true);
  });

  it("does not treat a pack-relative path as a repository path", () => {
    const error = asError(() => resolveRef("docs/SPEC/registry.md"));
    expect(error.code).toBe(5);
    expect(error.message).toBe("unknown path");
    expect(error.refs).toEqual(["docs/SPEC/registry.md"]);
  });

  it("a missing file is an error, not an empty success", async () => {
    const result = await run(["resolve", "glt-specpack/docs/SPEC/no-such-file.md", "-o", "json"]);
    expect(result.code).toBe(5);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("unknown path");
  });

  it("selector lines:10-40 extracts those lines of text", () => {
    const ref = JSON.stringify({
      repository: "glt-controlplane",
      path: REGISTRY_MD,
      authority: "engineering-contract",
      selector: "lines:10-40",
    });
    const hit = resolveRef(ref);
    expect(hit.kind).toBe("source_ref");
    if (hit.kind !== "source_ref") return;
    const expected = readText(join(REPO_ROOT, REGISTRY_MD)).split("\n").slice(9, 40).join("\n");
    expect(hit.excerpt).toBe(expected);
  });

  it("JSON Pointer selects a YAML field", () => {
    const ref = JSON.stringify({
      repository: "glt-controlplane",
      path: "glt-specpack/registry/glt-controlplane.yaml",
      authority: "glt-id-registry",
      selector: "/metadata/version",
    });
    const hit = resolveRef(ref);
    expect(hit.kind).toBe("source_ref");
    if (hit.kind !== "source_ref") return;
    expect(hit.excerpt).toBe('"0.2.0"');
  });

  it("JSON Pointer selects a JSON field", () => {
    const ref = JSON.stringify({
      repository: "glt-controlplane",
      path: "glt-specpack/contracts/schemas/source-ref.schema.json",
      authority: "wire-schema",
      selector: "/title",
    });
    const hit = resolveRef(ref);
    expect(hit.kind).toBe("source_ref");
    if (hit.kind !== "source_ref") return;
    expect(hit.excerpt).toBe('"SourceRef"');
  });

  it("a ref without commit and digest is navigation, not evidence", () => {
    const hit = resolveRef(REGISTRY_MD);
    expect(hit.kind).toBe("source_ref");
    if (hit.kind !== "source_ref") return;
    expect(hit.usable_as).toBe("navigation");
    expect(hit.commit).toBeUndefined();
  });

  it("role evidence without commit and digest is rejected", () => {
    const ref = JSON.stringify({
      repository: "glt-controlplane",
      path: REGISTRY_MD,
      authority: "engineering-contract",
      role: "evidence",
    });
    const error = asError(() => resolveRef(ref));
    expect(error.code).toBe(5);
    expect(error.message).toContain("commit and digest");
  });

  it("a digest that does not match the file fails resolution", () => {
    const ref = JSON.stringify({
      repository: "glt-controlplane",
      path: REGISTRY_MD,
      authority: "engineering-contract",
      commit: "0123456789abcdef",
      digest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    });
    const error = asError(() => resolveRef(ref));
    expect(error.code).toBe(5);
    expect(error.message).toBe("digest mismatch");
  });

  it("matching digest and commit make the ref usable as evidence", () => {
    const digest = digestOfUtf8(readText(join(REPO_ROOT, REGISTRY_MD)));
    const ref = JSON.stringify({
      repository: "glt-controlplane",
      path: REGISTRY_MD,
      authority: "engineering-contract",
      role: "evidence",
      commit: "0123456789abcdef",
      digest,
    });
    const hit = resolveRef(ref);
    expect(hit.kind).toBe("source_ref");
    if (hit.kind !== "source_ref") return;
    expect(hit.usable_as).toBe("evidence");
    expect(hit.digest).toBe(digest);
  });

  it("PROTO-02 an id that is another entry's alias is ambiguous, never the first hit", () => {
    const compiled = compileRegistry({
      ...aligned,
      entries: [entry("foo", ["OTHER"]), entry("bar", ["foo"])],
    });
    const error = asError(() => uniqueLocator(compiled, "foo"));
    expect(error.invariant).toBe("PROTO-02");
    expect(error.message).toBe("ambiguous locator");
    expect(error.refs).toEqual(["bar", "foo"]);
  });

  it("PROTO-02 unknown locator reports unknown, never a fallback id", () => {
    const compiled: CompiledRegistry = {
      version: "0.2.0",
      namespace: "glt.controlplane",
      boundary: "glt.bootstrap-slice@1",
      entries: [entry("foo", ["OTHER"]), entry("bar", ["baz"])],
      edges: [],
      aliases: [
        { alias: "OTHER", namespace: "glt.controlplane", semantic_id: "foo", revision: 1 },
        { alias: "baz", namespace: "glt.controlplane", semantic_id: "bar", revision: 1 },
      ],
    };
    const error = asError(() => uniqueLocator(compiled, "MISSING"));
    expect(error.invariant).toBe("PROTO-02");
    expect(error.message).toBe("unknown locator");
    expect(error.message).not.toContain("did you mean");
    expect(error.refs).not.toContain("foo");
  });

  it("glt resolve emits a relative path and no absolute location", async () => {
    const result = await run(["resolve", REGISTRY_MD, "-o", "json"]);
    expect(result.code).toBe(0);
    const body = JSON.parse(result.stdout) as { path: string; digest: string };
    expect(body.path).toBe(REGISTRY_MD);
    expect(result.stdout).not.toContain(REPO_ROOT);
    expect(body.digest).toBe(digestOfUtf8(readText(join(REPO_ROOT, REGISTRY_MD))));
  });

  it("glt resolve accepts a node id from the compiled registry", async () => {
    const result = await run(["resolve", "glt.controlplane.registry.entry", "-o", "json"]);
    expect(result.code).toBe(0);
    const body = JSON.parse(result.stdout) as { semantic_id: string; via: string };
    expect(body.semantic_id).toBe("glt.controlplane.registry.entry");
    expect(body.via).toBe("id");
  });

  it("classify does not guess a pack-relative path from a locator", () => {
    expect(classifyResolveInput("docs")).toEqual({ kind: "locator", locator: "docs" });
    expect(classifyResolveInput("docs/SPEC/registry.md").kind).toBe("path");
  });

  it("unknown selector is rejected rather than returning the whole file", () => {
    expect(asError(() => parseSelector("section:6.2")).code).toBe(2);
  });

  it("JSON Pointer ~1 unescapes to a slash", () => {
    expect(applyJsonPointer({ "a/b": true }, "/a~1b")).toBe(true);
  });

  it("resolver source never joins PACK_ROOT", () => {
    const src = readText(join(REPO_ROOT, "control-plane", "packages", "snapshot", "src", "resolve.ts"));
    expect(src).not.toContain("PACK_ROOT");
    expect(src).not.toContain("PACK.docs");
  });

  it("pack docs path exists so the pack-root trap is real", () => {
    expect(readText(join(PACK.docs, "SPEC", "registry.md")).length).toBeGreaterThan(0);
  });
});
