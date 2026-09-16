import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import { PACK, REPO_ROOT, loadYaml, readText } from "@glt/contracts";
import {
  RELEASE_STEP,
  RUNTIME_IDENTITY,
  Role,
  admitRelease,
  digestOfUtf8,
  imageBindingDigest,
  imageDigestFromRef,
  isPinnedImageRef,
  keyPairFromUtf8Seed,
  releaseInputDigest,
  signBytes,
  type PinnedInputs,
  type ReleasePolicyView,
} from "@glt/domain";

const IMAGE_HEX = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const IMAGE_REF = `glt-executor@sha256:${IMAGE_HEX}`;
const KEYS = keyPairFromUtf8Seed("release-signer");

interface ReleasePolicyFile {
  readonly spec?: {
    readonly control_plane_release?: {
      readonly requires_external_approval?: boolean;
      readonly forbidden_approvers?: readonly string[];
    };
  };
}

function policyFromPack(): ReleasePolicyView {
  const doc = loadYaml<ReleasePolicyFile>(PACK.releasePolicy);
  const release = doc.spec?.control_plane_release;
  return {
    requires_external_approval: release?.requires_external_approval === true,
    forbidden_approvers: release?.forbidden_approvers ?? [],
  };
}

function liveInputs(): PinnedInputs {
  const dockerfile = readText(join(REPO_ROOT, "deploy", "Dockerfile"));
  const from = [...dockerfile.matchAll(/^FROM\s+(\S+)/gm)].map((match) => match[1] ?? "")[0] ?? "";
  expect(isPinnedImageRef(from)).toBe(true);
  const fromDigest = imageDigestFromRef(from);
  expect(fromDigest).toBeDefined();
  return {
    lockfile: digestOfUtf8(readText(join(REPO_ROOT, "pnpm-lock.yaml"))),
    from_image: fromDigest!,
    schemas: digestOfUtf8(readText(join(PACK.schemas, "action-plan.schema.json"))),
    source: digestOfUtf8("glt-controlplane"),
  };
}

describe("DEV-34 supply chain client", () => {
  it("is the DEV-34 step", () => {
    expect(RELEASE_STEP).toBe("glt.dev.34");
    expect(existsSync(PACK.releasePolicy)).toBe(true);
  });

  it("PROTO-10 live Compose and FROM refs are pinned by the single checker", () => {
    const compose = loadYaml<{ services?: Record<string, { image?: string; build?: unknown }> }>(
      join(REPO_ROOT, "deploy", "compose.yaml"),
    );
    const pulled = Object.values(compose.services ?? {}).flatMap((service) => {
      if (service.build !== undefined || typeof service.image !== "string") return [];
      return [service.image];
    });
    const from = [...readText(join(REPO_ROOT, "deploy", "Dockerfile")).matchAll(/^FROM\s+(\S+)/gm)]
      .map((match) => match[1])
      .filter((ref): ref is string => ref !== undefined);
    expect(pulled.length).toBeGreaterThan(0);
    expect(from.length).toBeGreaterThan(0);
    expect([...pulled, ...from].filter((ref) => !isPinnedImageRef(ref))).toEqual([]);
  });

  it("PROTO-03 INV-09 a signed pin with pack policy admits only an external approver", () => {
    const policy = policyFromPack();
    expect(policy.requires_external_approval).toBe(true);
    expect(policy.forbidden_approvers).toContain(RUNTIME_IDENTITY);
    const pins = liveInputs();
    const signature = signBytes(
      KEYS.privateKey,
      Buffer.from(imageBindingDigest(IMAGE_REF), "utf8"),
    ).toString("base64");
    const admitted = admitRelease({
      images: [{ ref: IMAGE_REF, signature }],
      inputs: pins,
      reproduced: releaseInputDigest(pins),
      principal: { actor: "glt-bootstrap-builder@external", role: Role.Approver },
      plan: { authored_by: "alice@local", affects_control_plane_release: true },
      publicKey: KEYS.publicKey,
      policy,
    });
    expect(admitted.admitted).toBe(true);
    expect(admitted.approver).toBe("glt-bootstrap-builder@external");
    expect(() =>
      admitRelease({
        images: [{ ref: IMAGE_REF, signature }],
        inputs: pins,
        reproduced: releaseInputDigest(pins),
        principal: { actor: RUNTIME_IDENTITY, role: Role.Approver },
        plan: { authored_by: "alice@local", affects_control_plane_release: true },
        publicKey: KEYS.publicKey,
        policy,
      }),
    ).toThrow(/cannot approve/);
  });

  it("S-10 glt release is not a command", () => {
    const names = COMMANDS.map((command) => command.name);
    expect(names).not.toContain("release");
    expect(names).not.toContain("sign");
    expect(names).not.toContain("publish");
    expect(FORBIDDEN_COMMANDS).not.toContain("release");
  });
});
