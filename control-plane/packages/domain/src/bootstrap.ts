import { canonicalize } from "./canonical.ts";
import { digestOf } from "./digest.ts";
import { GltError, ExitCode } from "./errors.ts";
import { publicKeyFromPem, verifyBytes } from "./signature.ts";

/**
 * INV-10: the verifier uses a T0 key from outside the manifest under test.
 *
 * This module is pure. Callers load seed keys first, then pass them in together
 * with the already-parsed manifest. There is no function here that can read a
 * key out of the manifest, so an implementation that "just parsed the file to
 * see which key to use" cannot hide inside this module.
 */

export const BOOTSTRAP_FAILURE = {
  MissingSeedKey: "missing-seed-key",
  BadSignature: "bad-signature",
  EmbeddedKey: "embedded-key",
} as const;

type BootstrapFailureClass = (typeof BOOTSTRAP_FAILURE)[keyof typeof BOOTSTRAP_FAILURE];

export interface SeedKey {
  readonly keyId: string;
  readonly pem: string;
}

export interface BootstrapVerifyOk {
  readonly keyId: string;
  readonly payloadDigest: ReturnType<typeof digestOf>;
}

export function verifyBootstrapManifest(
  seedKeys: readonly SeedKey[],
  manifest: unknown,
): BootstrapVerifyOk {
  if (containsEmbeddedKeyMaterial(manifest)) {
    throw bootstrapFail(
      BOOTSTRAP_FAILURE.EmbeddedKey,
      ExitCode.InvariantViolation,
      "manifest carries key material; T0 keys come from seed-public-keys/, not from the artifact under test",
    );
  }

  const keyId = trustRootKeyId(manifest);
  const seed = seedKeys.find((k) => k.keyId === keyId);
  if (!seed) {
    throw new GltError({
      code: ExitCode.EvidenceInsufficient,
      invariant: "INV-10",
      message: `T0 key ${keyId} is not in the seed-public-keys/ set loaded before the manifest`,
      refs: [BOOTSTRAP_FAILURE.MissingSeedKey, keyId],
    });
  }

  const signature = signatureBytes(manifest);
  const payload = stripSignature(manifest);
  const message = Buffer.from(canonicalize(payload), "utf8");
  const ok = verifyBytes(publicKeyFromPem(seed.pem), message, signature);
  if (!ok) {
    throw bootstrapFail(
      BOOTSTRAP_FAILURE.BadSignature,
      ExitCode.InvariantViolation,
      `manifest signature does not verify under T0 key ${keyId}`,
      keyId,
    );
  }

  return { keyId, payloadDigest: digestOf(payload) };
}

function bootstrapFail(
  klass: BootstrapFailureClass,
  code: typeof ExitCode.InvariantViolation,
  message: string,
  extra?: string,
): GltError {
  return new GltError({
    code,
    invariant: "INV-10",
    message,
    refs: extra ? [klass, extra] : [klass],
  });
}

function trustRootKeyId(manifest: unknown): string {
  const spec = asRecord(asRecord(manifest)["spec"]);
  const root = asRecord(spec["trust_root"]);
  const keyId = root["key_id"];
  if (typeof keyId !== "string" || keyId.length === 0) {
    throw new GltError({
      code: ExitCode.ContractInvalid,
      message: "bootstrap manifest spec.trust_root.key_id is missing",
    });
  }
  return keyId;
}

function signatureBytes(manifest: unknown): Buffer {
  const metadata = asRecord(asRecord(manifest)["metadata"]);
  const signature = metadata["signature"];
  if (signature === undefined) {
    throw bootstrapFail(
      BOOTSTRAP_FAILURE.BadSignature,
      ExitCode.InvariantViolation,
      "bootstrap manifest has no metadata.signature",
    );
  }
  const rec = asRecord(signature);
  const value = rec["value"];
  if (typeof value !== "string" || value.length === 0) {
    throw bootstrapFail(
      BOOTSTRAP_FAILURE.BadSignature,
      ExitCode.InvariantViolation,
      "bootstrap manifest metadata.signature.value is missing",
    );
  }
  const keyId = rec["key_id"];
  if (typeof keyId === "string" && keyId !== trustRootKeyId(manifest)) {
    throw bootstrapFail(
      BOOTSTRAP_FAILURE.BadSignature,
      ExitCode.InvariantViolation,
      "signature.key_id does not match spec.trust_root.key_id",
      keyId,
    );
  }
  return Buffer.from(value, "base64");
}

export function stripSignature(manifest: unknown): unknown {
  const copy = structuredClone(manifest) as { metadata?: Record<string, unknown> };
  if (copy.metadata && "signature" in copy.metadata) delete copy.metadata["signature"];
  return copy;
}

function containsEmbeddedKeyMaterial(value: unknown): boolean {
  if (typeof value === "string") {
    return value.includes("BEGIN PUBLIC KEY") || value.includes("BEGIN PRIVATE KEY");
  }
  if (Array.isArray(value)) return value.some(containsEmbeddedKeyMaterial);
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "public_key" || k === "private_key" || k === "pem") return true;
      if (k === "signature") continue;
      if (containsEmbeddedKeyMaterial(v)) return true;
    }
  }
  return false;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GltError({
      code: ExitCode.ContractInvalid,
      message: "bootstrap manifest is not an object",
    });
  }
  return value as Record<string, unknown>;
}
