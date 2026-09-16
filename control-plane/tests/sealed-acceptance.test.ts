import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import { PACK, REPO_ROOT, loadYaml, readText } from "@glt/contracts";
import {
  DEV_ONLY_KEY_ID,
  ESCAPE_SCENARIOS,
  SEAL_STEP,
  admitSealedRelease,
  admitTrustRoots,
  isUnfrozenPlaceholder,
  rejectReleasePlaceholders,
} from "@glt/domain";

interface ReleasePolicyFile {
  readonly spec?: {
    readonly release_trust_roots?: {
      readonly allowed?: readonly string[];
      readonly forbidden?: readonly { readonly key_id?: string }[];
    };
  };
}

interface BootstrapManifest {
  readonly spec?: {
    readonly verifier?: { readonly binary_digest?: string };
    readonly witness?: { readonly endpoint?: string };
    readonly trust_root?: { readonly key_id?: string };
  };
}

function packRoots() {
  const doc = loadYaml<ReleasePolicyFile>(PACK.releasePolicy);
  const roots = doc.spec?.release_trust_roots;
  const manifest = loadYaml<BootstrapManifest>(PACK.bootstrapManifest);
  return {
    allowed: roots?.allowed ?? [],
    forbidden: (roots?.forbidden ?? []).flatMap((row) =>
      row.key_id === undefined ? [] : [row.key_id],
    ),
    terminating_key_id: manifest.spec?.trust_root?.key_id ?? DEV_ONLY_KEY_ID,
  };
}

describe("DEV-35 sealed acceptance client", () => {
  it("is the DEV-35 step", () => {
    expect(SEAL_STEP).toBe("glt.dev.35");
    expect(existsSync(join(PACK.docs, "OBSERVABILITY", "runbooks", "disaster-recovery.md"))).toBe(
      true,
    );
  });

  it("INV-10 the live pack allow-list is empty and the dev-only key is forbidden", () => {
    const roots = packRoots();
    expect(roots.allowed).toEqual([]);
    expect(roots.forbidden).toContain(DEV_ONLY_KEY_ID);
    expect(roots.terminating_key_id).toBe(DEV_ONLY_KEY_ID);
    expect(() => admitTrustRoots(roots)).toThrow(/INV-10|allow-list|dev-only/);
  });

  it("PROTO-10 live verifier digest and witness endpoint are still placeholders", () => {
    const manifest = loadYaml<BootstrapManifest>(PACK.bootstrapManifest);
    const verifier = manifest.spec?.verifier?.binary_digest ?? "";
    const witness = manifest.spec?.witness?.endpoint ?? "";
    expect(verifier).toContain("placeholder");
    expect(witness).toContain("example.invalid");
    expect(() =>
      rejectReleasePlaceholders({
        verifier_binary_digest: verifier,
        witness_endpoint: witness,
        golden_digests: ["sha256:0000000000000000000000000000000000000000000000000000000000000000"],
      }),
    ).toThrow(/placeholder|example\.invalid/);
  });

  it("INV-03 frozen goldens are not the all-zero placeholder", () => {
    const bootstrap = loadYaml<{ digest?: string }>(
      join(PACK.examples, "golden", "bootstrap-snapshot.json"),
    );
    const impact = loadYaml<{ digest?: string }>(
      join(PACK.examples, "golden", "impact-bootstrap.json"),
    );
    expect(isUnfrozenPlaceholder(bootstrap.digest ?? "")).toBe(false);
    expect(isUnfrozenPlaceholder(impact.digest ?? "")).toBe(false);
  });

  it("INV-06 E06 lists six escape denials and T1-T10 are named", () => {
    expect(ESCAPE_SCENARIOS).toHaveLength(6);
    const threats = readText(join(PACK.docs, "SECURITY", "threat-model.md"));
    for (const id of ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"]) {
      expect(threats).toContain(`| ${id} `);
    }
  });

  it("INV-07 holdout H01-H05 stays sealed and is not a parameter dial", () => {
    const holdout = readText(PACK.holdoutCases);
    expect(holdout).toContain("frozen_at: 2026-08-14");
    expect(holdout).toContain("Do not tune parameters against holdout");
    const ids = [...holdout.matchAll(/^\s+- id: (H0[1-5])$/gm)].map((match) => match[1]);
    expect(ids).toEqual(["H01", "H02", "H03", "H04", "H05"]);
  });

  it("S-10 glt seal is not a command", () => {
    const names = COMMANDS.map((command) => command.name);
    expect(names).not.toContain("seal");
    expect(names).not.toContain("accept");
    expect(names).not.toContain("release");
    expect(FORBIDDEN_COMMANDS).not.toContain("seal");
    expect(typeof admitSealedRelease).toBe("function");
    expect(existsSync(join(REPO_ROOT, "deploy", "compose.yaml"))).toBe(true);
  });
});
