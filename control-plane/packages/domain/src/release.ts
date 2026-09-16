/**
 * Supply-chain release admission (DEV-34). Pure: image refs, signatures,
 * input digests and the parsed release policy arrive already parsed.
 * No pull, no build, no Cosign, no workspace write (S-1).
 *
 * Pin is name@sha256:hex (PROTO-10). Signature is verifyBytes over
 * digestOf({ ref, digest }) (S-4, PROTO-14). Same pinned inputs must
 * reproduce (PROTO-03). authorize is the only ACL; the runtime cannot
 * approve a control-plane release (INV-09).
 *
 * Contract: glt-specpack/docs/SECURITY/supply-chain.md
 */

import type { KeyObject } from "node:crypto";
import { digestOf, isDigest, isUnfrozenPlaceholder } from "./digest.ts";
import { contractInvalid, invariantViolated, policyDenied } from "./errors.ts";
import {
  Capability,
  authorize,
  type PlanSubject,
  type Principal,
} from "./policy.ts";
import { verifyBytes } from "./signature.ts";

export const RELEASE_STEP = "glt.dev.34" as const;

const IMAGE_DIGEST_MARKER = "@sha256:" as const;

export interface PinnedInputs {
  readonly lockfile: string;
  readonly from_image: string;
  readonly schemas: string;
  readonly source: string;
}

export interface SignedImage {
  readonly ref: string;
  readonly signature: string;
}

export interface ReleasePolicyView {
  readonly requires_external_approval: boolean;
  readonly forbidden_approvers: readonly string[];
}

export interface AdmitReleaseInput {
  readonly images: readonly SignedImage[];
  readonly inputs: PinnedInputs;
  readonly reproduced: string;
  readonly principal: Principal;
  readonly plan: PlanSubject;
  readonly publicKey: KeyObject;
  readonly policy: ReleasePolicyView;
}

export interface ReleaseAdmission {
  readonly admitted: true;
  readonly input_digest: string;
  readonly image_digests: readonly string[];
  readonly approver: string;
}

export function imageDigestFromRef(ref: string): string | undefined {
  const trimmed = ref.trim();
  const at = trimmed.lastIndexOf(IMAGE_DIGEST_MARKER);
  if (at < 1) return undefined;
  const digest = `sha256:${trimmed.slice(at + IMAGE_DIGEST_MARKER.length)}`;
  if (!isDigest(digest) || isUnfrozenPlaceholder(digest)) return undefined;
  return digest;
}

export function isPinnedImageRef(ref: string): boolean {
  return imageDigestFromRef(ref) !== undefined;
}

export function requirePinnedImageRef(ref: string): string {
  const digest = imageDigestFromRef(ref);
  if (digest === undefined) {
    throw invariantViolated("PROTO-10", "release image is not pinned by digest", [ref]);
  }
  return digest;
}

/** Single message the image signature binds: ref + digest (S-4). */
export function imageBindingDigest(ref: string): string {
  const trimmed = asNonEmpty(ref, "image.ref");
  return digestOf({ ref: trimmed, digest: requirePinnedImageRef(trimmed) });
}

export function releaseInputDigest(inputs: PinnedInputs): string {
  return digestOf({
    lockfile: requireContentDigest(inputs.lockfile, "lockfile"),
    from_image: requireContentDigest(inputs.from_image, "from_image"),
    schemas: requireContentDigest(inputs.schemas, "schemas"),
    source: requireContentDigest(inputs.source, "source"),
  });
}

export function admitRelease(input: AdmitReleaseInput): ReleaseAdmission {
  if (input.images.length < 1) {
    throw contractInvalid("release admits no image");
  }
  if (input.policy.requires_external_approval !== true) {
    throw policyDenied("control plane release requires external approval", ["policy"], "INV-09");
  }
  if (input.plan.affects_control_plane_release !== true) {
    throw policyDenied(
      "control plane release requires an external approver identity",
      ["affects_control_plane_release"],
      "INV-09",
    );
  }
  authorize({
    principal: input.principal,
    capability: Capability.Approve,
    plan: input.plan,
    forbiddenApprovers: input.policy.forbidden_approvers,
  });

  const imageDigests = input.images.map((image) => admitSignedImage(image, input.publicKey));
  const inputDigest = releaseInputDigest(input.inputs);
  if (input.reproduced !== inputDigest) {
    throw invariantViolated("PROTO-03", "pinned release inputs did not reproduce", [
      inputDigest,
      input.reproduced,
    ]);
  }

  return {
    admitted: true,
    input_digest: inputDigest,
    image_digests: imageDigests,
    approver: input.principal.actor,
  };
}

function admitSignedImage(image: SignedImage, publicKey: KeyObject): string {
  const ref = asNonEmpty(image.ref, "image.ref");
  const digest = requirePinnedImageRef(ref);
  const signature = asNonEmpty(image.signature, "image.signature");
  const message = Buffer.from(imageBindingDigest(ref), "utf8");
  let ok = false;
  try {
    ok = verifyBytes(publicKey, message, Buffer.from(signature, "base64"));
  } catch {
    ok = false;
  }
  if (!ok) {
    throw invariantViolated("PROTO-14", "release image is not signed", [ref]);
  }
  return digest;
}

function requireContentDigest(value: string, field: string): string {
  const trimmed = value.trim();
  if (!isDigest(trimmed) || isUnfrozenPlaceholder(trimmed)) {
    throw invariantViolated("PROTO-10", "release input is not a content digest", [field]);
  }
  return trimmed;
}

function asNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw contractInvalid(`${field} is required`);
  return trimmed;
}
