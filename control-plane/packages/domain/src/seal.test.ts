import { describe, expect, it } from "vitest";
import { ExitCode, GltError } from "./errors.ts";
import { RUNTIME_IDENTITY, Role } from "./policy.ts";
import {
  imageBindingDigest,
  releaseInputDigest,
  type AdmitReleaseInput,
  type PinnedInputs,
} from "./release.ts";
import {
  DEV_ONLY_KEY_ID,
  SEAL_STEP,
  admitSealedRelease,
  admitTrustRoots,
  rejectReleasePlaceholders,
  type AdmitSealedReleaseInput,
  type SealArtifacts,
  type TrustRootsView,
} from "./seal.ts";
import { keyPairFromUtf8Seed, signBytes } from "./signature.ts";

const LOCKFILE = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const FROM = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SCHEMAS = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const SOURCE = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const IMAGE_HEX = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const IMAGE_REF = `glt-executor@sha256:${IMAGE_HEX}`;
const GOLDEN = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const KEYS = keyPairFromUtf8Seed("release-signer");
const APPROVER = { actor: "glt-bootstrap-builder@external", role: Role.Approver };

describe("DEV-35 sealed acceptance", () => {
  it("is the DEV-35 step", () => {
    expect(SEAL_STEP).toBe("glt.dev.35");
    expect(DEV_ONLY_KEY_ID).toBe("glt-dev-only-2026");
  });

  it("INV-10 an empty or dev-only trust root is not a sealed release", () => {
    expectThrown(() => admitTrustRoots({ ...roots(), allowed: [] }), "INV-10");
    expectThrown(
      () => admitTrustRoots({ ...roots(), terminating_key_id: DEV_ONLY_KEY_ID }),
      "INV-10",
    );
    expectThrown(
      () => admitSealedRelease(valid({ roots: { ...roots(), allowed: [] } })),
      "INV-10",
    );
    expectThrown(
      () =>
        admitSealedRelease(
          valid({ roots: { ...roots(), terminating_key_id: DEV_ONLY_KEY_ID, allowed: [DEV_ONLY_KEY_ID] } }),
        ),
      "INV-10",
    );
  });

  it("PROTO-10 a placeholder verifier, golden or witness is not a sealed release", () => {
    expectThrown(
      () =>
        rejectReleasePlaceholders({
          ...artifacts(),
          verifier_binary_digest: "sha256:placeholder-replaced-at-release",
        }),
      "PROTO-10",
    );
    expectThrown(
      () =>
        rejectReleasePlaceholders({
          ...artifacts(),
          golden_digests: ["sha256:0000000000000000000000000000000000000000000000000000000000000000"],
        }),
      "PROTO-10",
    );
    expect(() =>
      rejectReleasePlaceholders({
        ...artifacts(),
        witness_endpoint: "https://witness.example.invalid/v1/anchor",
      }),
    ).toThrow(/example\.invalid/);
    expectThrown(
      () =>
        admitSealedRelease(
          valid({ artifacts: { ...artifacts(), verifier_binary_digest: "sha256:placeholder-replaced-at-release" } }),
        ),
      "PROTO-10",
    );
  });

  it("INV-10 a real allowed root and frozen artifacts admit the seal", () => {
    const sealed = admitSealedRelease(valid());
    expect(sealed.sealed).toBe(true);
    expect(sealed.terminating_key_id).toBe("glt-root-2026");
    expect(sealed.admitted).toBe(true);
  });
});

function valid(override: Partial<AdmitSealedReleaseInput> = {}): AdmitSealedReleaseInput {
  return {
    release: override.release ?? releaseInput(),
    roots: override.roots ?? roots(),
    artifacts: override.artifacts ?? artifacts(),
  };
}

function releaseInput(): AdmitReleaseInput {
  const pins = inputs();
  return {
    images: [
      {
        ref: IMAGE_REF,
        signature: signBytes(KEYS.privateKey, Buffer.from(imageBindingDigest(IMAGE_REF), "utf8")).toString(
          "base64",
        ),
      },
    ],
    inputs: pins,
    reproduced: releaseInputDigest(pins),
    principal: APPROVER,
    plan: { authored_by: "alice@local", affects_control_plane_release: true },
    publicKey: KEYS.publicKey,
    policy: { requires_external_approval: true, forbidden_approvers: [RUNTIME_IDENTITY] },
  };
}

function roots(): TrustRootsView {
  return {
    allowed: ["glt-root-2026"],
    forbidden: [DEV_ONLY_KEY_ID],
    terminating_key_id: "glt-root-2026",
  };
}

function artifacts(): SealArtifacts {
  return {
    verifier_binary_digest: GOLDEN,
    witness_endpoint: "https://witness.example.com/v1/anchor",
    golden_digests: [GOLDEN],
  };
}

function inputs(): PinnedInputs {
  return { lockfile: LOCKFILE, from_image: FROM, schemas: SCHEMAS, source: SOURCE };
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
  if (invariant === "INV-10") expect((caught as GltError).code).toBe(ExitCode.PolicyDenied);
}
