/**
 * SourceRef I/O (DEV-07). `path` joins to the repository root named in
 * `repository`, never to the pack root. Guessing between `docs/SPEC/...` and
 * `glt-specpack/docs/...` is forbidden — same rule as PROTO-02.
 */

import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { REPO_ROOT, createValidator, loadDocument, readText, validateAgainst } from "@glt/contracts";
import {
  applySelector,
  assertDigestMatch,
  classifyResolveInput,
  digestOfUtf8,
  parseSelector,
  requireEvidencePins,
  uniqueLocator,
  usableAs,
  usageError,
  evidenceInsufficient,
  contractInvalid,
  type CompiledRegistry,
  type ResolvedRef,
  type SourceRefView,
} from "@glt/domain";
import { compileRegistryFromPaths } from "@glt/registry";

const LOCAL_REPOSITORY = "glt-controlplane";

export interface ResolveIo {
  readonly repoRoot: string;
  readonly repository: string;
  readonly exists: (absPath: string) => boolean;
  readonly read: (absPath: string) => string;
  readonly parseStructured: (absPath: string) => unknown;
  readonly loadRegistry: () => CompiledRegistry;
}

export interface ResolveOptions {
  readonly registry?: string;
  readonly boundary?: string;
}

const defaultIo: ResolveIo = {
  repoRoot: REPO_ROOT,
  repository: LOCAL_REPOSITORY,
  exists: existsSync,
  read: readText,
  parseStructured: (absPath) => loadDocument(absPath),
  loadRegistry: () => compileRegistryFromPaths(),
};

export function ioFromOptions(options: ResolveOptions = {}): ResolveIo {
  return {
    ...defaultIo,
    loadRegistry: () =>
      compileRegistryFromPaths({
        ...(options.registry !== undefined ? { bundlePath: options.registry } : {}),
        ...(options.boundary !== undefined ? { boundaryRef: options.boundary } : {}),
      }),
  };
}

export function resolveRef(raw: string, io: ResolveIo = defaultIo): ResolvedRef {
  const input = classifyResolveInput(raw);
  if (input.kind === "json") return resolveSourceRefObject(parseSourceRefJson(input.raw), io);
  if (input.kind === "path") return resolveSourceRefObject({ repository: io.repository, path: input.path }, io);
  return resolveLocator(input.locator, io);
}

export function renderResolved(value: ResolvedRef): string {
  if (value.kind === "locator") {
    return `${value.semantic_id} rev ${String(value.revision)} (${value.via})`;
  }
  return `${value.path} ${value.usable_as} ${value.digest}`;
}

function resolveLocator(locator: string, io: ResolveIo): ResolvedRef {
  const hit = uniqueLocator(io.loadRegistry(), locator);
  return {
    kind: "locator",
    locator,
    semantic_id: hit.semantic_id,
    revision: hit.revision,
    namespace: hit.namespace,
    via: hit.via,
    usable_as: "navigation",
  };
}

function resolveSourceRefObject(ref: SourceRefView, io: ResolveIo): ResolvedRef {
  requireEvidencePins(ref);
  if (ref.repository !== io.repository) {
    throw evidenceInsufficient("unknown repository", [ref.repository]);
  }

  const posixPath = ref.path.replaceAll("\\", "/");
  const abs = resolveRepoPath(io.repoRoot, posixPath);
  if (!io.exists(abs)) {
    throw evidenceInsufficient("unknown path", [posixPath]);
  }

  const text = io.read(abs);
  const digest = digestOfUtf8(text);
  if (ref.digest !== undefined) assertDigestMatch(ref.digest, digest);

  const selector = parseSelector(ref.selector);
  const structured = selector.kind === "pointer" ? loadStructured(abs, posixPath, io) : undefined;
  const excerpt = applySelector(text, selector, structured);
  const matched = ref.digest !== undefined;

  return {
    kind: "source_ref",
    repository: ref.repository,
    path: relativePosix(io.repoRoot, abs),
    digest,
    usable_as: usableAs(ref, matched),
    excerpt,
    ...(ref.commit !== undefined ? { commit: ref.commit } : {}),
    ...(ref.selector !== undefined ? { selector: ref.selector } : {}),
    ...(ref.authority !== undefined ? { authority: ref.authority } : {}),
    ...(ref.role !== undefined ? { role: ref.role } : {}),
  };
}

function parseSourceRefJson(raw: string): SourceRefView {
  let doc: unknown;
  try {
    doc = JSON.parse(raw) as unknown;
  } catch {
    throw usageError("SourceRef JSON is not parseable");
  }
  const problems = validateAgainst(createValidator(), "source-ref", doc);
  if (problems.length > 0) {
    throw contractInvalid(
      problems.map((e) => `${e.path} ${e.message}`).join("; "),
    );
  }
  return doc as SourceRefView;
}

function resolveRepoPath(repoRoot: string, path: string): string {
  if (isAbsolute(path)) {
    throw usageError("SourceRef path must be repository-relative", [path]);
  }
  const abs = resolve(repoRoot, path);
  const rel = relative(repoRoot, abs);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw usageError("SourceRef path escapes the repository root", [path]);
  }
  return abs;
}

function relativePosix(repoRoot: string, abs: string): string {
  return relative(repoRoot, abs).replaceAll("\\", "/");
}

function loadStructured(abs: string, posixPath: string, io: ResolveIo): unknown {
  if (!/\.(?:ya?ml|json)$/i.test(posixPath)) {
    throw contractInvalid("JSON Pointer requires YAML or JSON", [posixPath]);
  }
  return io.parseStructured(abs);
}
