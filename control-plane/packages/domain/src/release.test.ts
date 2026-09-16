import { describe, expect, it } from "vitest";
import { digestOf } from "./digest.ts";
import { ExitCode, GltError } from "./errors.ts";
import { RUNTIME_IDENTITY, Role } from "./policy.ts";
import {
  RELEASE_STEP,
  admitRelease,
  imageBindingDigest,
  isPinnedImageRef,
  releaseInputDigest,
  requirePinnedImageRef,
  type AdmitReleaseInput,
  type PinnedInputs,
  type ReleasePolicyView,
  type SignedImage,
} from "./release.ts";
import { keyPairFromUtf8Seed, signBytes } from "./signature.ts";

const LOCKFILE = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const FROM = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SCHEMAS = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const SOURCE = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const IMAGE_HEX = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const IMAGE_REF = `glt-executor@sha256:${IMAGE_HEX}`;
const KEYS = keyPairFromUtf8Seed("release-signer");
const APPROVER = { actor: "glt-bootstrap-builder@external", role: Role.Approver };
const POLICY: ReleasePolicyView = {
  requires_external_approval: true,
  forbidden_approvers: [RUNTIME_IDENTITY],
};

describe("DEV-34 supply chain release", () => {
  it("is the DEV-34 step", () => {
    expect(RELEASE_STEP).toBe("glt.dev.34");
  });

  it("PROTO-10 a floating tag is not a pinned image", () => {
    expect(isPinnedImageRef("postgres:16-alpine")).toBe(false);
    expect(isPinnedImageRef(`glt-executor:latest@sha256:${"0".repeat(64)}`)).toBe(false);
    expectThrown(() => requirePinnedImageRef("glt-executor:latest"), "PROTO-10");
    expectThrown(
      () => admitRelease(valid({ images: [{ ref: "glt-executor:latest", signature: "x" }] })),
      "PROTO-10",
    );
  });

  it("PROTO-14 an unsigned or retagged image is not admitted", () => {
    expectThrown(
      () => admitRelease(valid({ images: [{ ref: IMAGE_REF, signature: "not-a-signature" }] })),
      "PROTO-14",
    );
    const other = `glt-executor:v2@sha256:${IMAGE_HEX}`;
    expectThrown(
      () => admitRelease(valid({ images: [{ ref: other, signature: signRef(IMAGE_REF) }] })),
      "PROTO-14",
    );
  });

  it("PROTO-03 the same pinned inputs reproduce the release digest", () => {
    const admitted = admitRelease(valid());
    expect(admitted.admitted).toBe(true);
    expect(admitted.input_digest).toBe(releaseInputDigest(inputs()));
    expect(admitted.input_digest).toBe(digestOf(inputs()));
    expect(admitted.image_digests).toEqual([`sha256:${IMAGE_HEX}`]);
    expectThrown(() => admitRelease(valid({ reproduced: FROM })), "PROTO-03");
    expectThrown(
      () =>
        admitRelease(
          valid({ inputs: { ...inputs(), lockfile: FROM }, reproduced: releaseInputDigest(inputs()) }),
        ),
      "PROTO-03",
    );
  });

  it("INV-09 the runtime cannot approve a control-plane release", () => {
    expectThrown(
      () =>
        admitRelease(
          valid({ principal: { actor: RUNTIME_IDENTITY, role: Role.Approver } }),
        ),
      "INV-09",
    );
    expectThrown(
      () => admitRelease(valid({ policy: { ...POLICY, requires_external_approval: false } })),
      "INV-09",
    );
    expectThrown(
      () => admitRelease(valid({ plan: { authored_by: APPROVER.actor } })),
      "INV-09",
    );
  });
});

function valid(override: Partial<AdmitReleaseInput> = {}): AdmitReleaseInput {
  const pins = override.inputs ?? inputs();
  return {
    images: override.images ?? [signed(IMAGE_REF)],
    inputs: pins,
    reproduced: override.reproduced ?? releaseInputDigest(pins),
    principal: override.principal ?? APPROVER,
    plan: override.plan ?? { authored_by: "alice@local", affects_control_plane_release: true },
    publicKey: override.publicKey ?? KEYS.publicKey,
    policy: override.policy ?? POLICY,
  };
}

function inputs(): PinnedInputs {
  return { lockfile: LOCKFILE, from_image: FROM, schemas: SCHEMAS, source: SOURCE };
}

function signed(ref: string): SignedImage {
  return { ref, signature: signRef(ref) };
}

function signRef(ref: string): string {
  return signBytes(KEYS.privateKey, Buffer.from(imageBindingDigest(ref), "utf8")).toString(
    "base64",
  );
}

function expectThrown(run: () => void, invariant: string): void {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(GltError);
  expect((caught as GltError).invariant).toBe(invariant);
  if (invariant === "INV-09") expect((caught as GltError).code).toBe(ExitCode.PolicyDenied);
}
