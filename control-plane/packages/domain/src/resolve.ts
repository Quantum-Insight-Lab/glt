/**
 * Alias resolution and registry compilation (PROTO-01, PROTO-02, PROTO-08,
 * PROTO-09). Pure: the filesystem stays in `packages/registry`.
 *
 * resolve(alias, namespace, registry_version) → {semantic_id, revision} | error.
 * Unknown or ambiguous never becomes a guess (INV-02).
 */

import { digestOf } from "./digest.ts";
import { contractInvalid, invariantViolated } from "./errors.ts";

export interface RegistryEntryView {
  readonly id: string;
  readonly revision: number;
  readonly namespace: string;
  readonly aliases: readonly string[];
  readonly spec: unknown;
}

export interface RegistryEdgeView {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

export interface AliasBinding {
  readonly alias: string;
  readonly namespace: string;
  readonly semantic_id: string;
  readonly revision: number;
}

export interface CompiledRegistry {
  readonly version: string;
  readonly namespace: string;
  readonly boundary: string;
  readonly entries: readonly RegistryEntryView[];
  readonly edges: readonly RegistryEdgeView[];
  readonly aliases: readonly AliasBinding[];
}

export interface CompileRegistryInput {
  readonly version: string;
  readonly namespace: string;
  readonly boundary: string;
  readonly entries: readonly RegistryEntryView[];
  readonly edges: readonly RegistryEdgeView[];
  readonly boundaryNodes: readonly string[];
  readonly boundaryEdges: readonly string[];
  readonly previous?: {
    readonly version: string;
    readonly aliases: readonly AliasBinding[];
  };
}

export function compileRegistry(input: CompileRegistryInput): CompiledRegistry {
  rejectSemanticChangeWithoutRevision(input.entries);
  const aliases = uniqueAliasBindings(input.entries, input.version);
  rejectReassignment(aliases, input.version, input.previous);
  rejectBoundaryDivergence(input);

  return {
    version: input.version,
    namespace: input.namespace,
    boundary: input.boundary,
    entries: sortById(input.entries),
    edges: sortById(input.edges),
    aliases: sortBindings(aliases),
  };
}

/**
 * Strict lookup. Zero matches → unknown. Two or more → ambiguous.
 * Never returns the first candidate (PROTO-02 / INV-02).
 */
export function resolveAlias(
  compiled: CompiledRegistry,
  alias: string,
  namespace: string,
  registryVersion: string,
): AliasBinding {
  const needle = nfc(alias);
  if (registryVersion !== compiled.version) {
    throw invariantViolated("PROTO-02", "unknown alias", [alias, namespace, registryVersion]);
  }
  const hits = compiled.aliases.filter(
    (binding) => binding.namespace === namespace && binding.alias === needle,
  );
  if (hits.length === 0) {
    throw invariantViolated("PROTO-02", "unknown alias", [alias, namespace, registryVersion]);
  }
  if (hits.length !== 1) {
    throw invariantViolated(
      "PROTO-02",
      "ambiguous alias",
      hits.map((h) => h.semantic_id),
    );
  }
  return hits[0]!;
}

function uniqueAliasBindings(
  entries: readonly RegistryEntryView[],
  version: string,
): AliasBinding[] {
  const byKey = new Map<string, AliasBinding[]>();
  for (const entry of entries) {
    const seenOnEntry = new Set<string>();
    for (const raw of entry.aliases) {
      const alias = nfc(raw);
      if (alias.length === 0) continue;
      if (seenOnEntry.has(alias)) continue;
      seenOnEntry.add(alias);
      const key = `${entry.namespace}\0${alias}`;
      const binding: AliasBinding = {
        alias,
        namespace: entry.namespace,
        semantic_id: entry.id,
        revision: entry.revision,
      };
      const group = byKey.get(key) ?? [];
      group.push(binding);
      byKey.set(key, group);
    }
  }

  const out: AliasBinding[] = [];
  for (const group of byKey.values()) {
    const ids = unique(group.map((b) => b.semantic_id));
    if (ids.length > 1) {
      throw invariantViolated(
        "PROTO-01",
        `alias ${group[0]!.alias} in ${group[0]!.namespace}@${version} maps to more than one id`,
        ids,
      );
    }
    out.push(group[0]!);
  }
  return out;
}

function rejectReassignment(
  current: readonly AliasBinding[],
  version: string,
  previous: CompileRegistryInput["previous"],
): void {
  if (previous === undefined || previous.version !== version) return;
  const prior = new Map<string, AliasBinding>();
  for (const binding of previous.aliases) {
    prior.set(`${binding.namespace}\0${nfc(binding.alias)}`, {
      ...binding,
      alias: nfc(binding.alias),
    });
  }
  for (const binding of current) {
    const was = prior.get(`${binding.namespace}\0${binding.alias}`);
    if (was === undefined) continue;
    if (was.semantic_id !== binding.semantic_id) {
      throw invariantViolated(
        "PROTO-08",
        `alias ${binding.alias} reassigned within registry version ${version}`,
        [was.semantic_id, binding.semantic_id],
      );
    }
  }
}

function rejectSemanticChangeWithoutRevision(entries: readonly RegistryEntryView[]): void {
  const byId = new Map<string, RegistryEntryView[]>();
  for (const entry of entries) {
    const group = byId.get(entry.id) ?? [];
    group.push(entry);
    byId.set(entry.id, group);
  }
  for (const [id, group] of byId) {
    if (group.length < 2) continue;
    const revisions = unique(group.map((e) => String(e.revision)));
    const digests = unique(group.map((e) => digestOf(e.spec)));
    if (revisions.length === 1 && digests.length > 1) {
      throw invariantViolated(
        "PROTO-09",
        `semantic change of ${id} without a revision bump`,
        [id, ...revisions],
      );
    }
    throw contractInvalid(`registry id ${id} is declared more than once`, [id]);
  }
}

function rejectBoundaryDivergence(input: CompileRegistryInput): void {
  const bundleNodes = input.entries.map((e) => e.id);
  const bundleEdges = input.edges.map((e) => e.id);
  const nodeDrift = setDrift(bundleNodes, input.boundaryNodes);
  const edgeDrift = setDrift(bundleEdges, input.boundaryEdges);
  if (nodeDrift.length === 0 && edgeDrift.length === 0) return;
  throw contractInvalid("bundle and boundary manifest diverge", [...nodeDrift, ...edgeDrift]);
}

function setDrift(left: readonly string[], right: readonly string[]): string[] {
  const a = new Set(left);
  const b = new Set(right);
  const extra = left.filter((id) => !b.has(id)).map((id) => `bundle:${id}`);
  const missing = right.filter((id) => !a.has(id)).map((id) => `boundary:${id}`);
  return [...extra, ...missing].sort();
}

function nfc(value: string): string {
  return value.normalize("NFC");
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function sortById<T extends { readonly id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => compare(a.id, b.id));
}

function sortBindings(items: readonly AliasBinding[]): AliasBinding[] {
  return [...items].sort((a, b) => {
    const ns = compare(a.namespace, b.namespace);
    return ns !== 0 ? ns : compare(a.alias, b.alias);
  });
}

function compare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
