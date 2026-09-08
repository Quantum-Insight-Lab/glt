import {
  createPrivateKey,
  createPublicKey,
  sign as ed25519Sign,
  verify as ed25519Verify,
  type KeyObject,
} from "node:crypto";
import { sha256Bytes } from "./digest.ts";

/**
 * Ed25519 via node:crypto (S-4). The only signature implementation.
 *
 * PKCS8 prefix is the DER encoding of an Ed25519 private key wrapping a
 * 32-byte seed; it is a format constant, not a behaviour parameter (S-8).
 */

const PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function privateKeyFromSeed(seed: Buffer): KeyObject {
  return createPrivateKey({
    key: Buffer.concat([PKCS8_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
}

/** `seed = sha256(utf8)` as specified for `glt-dev-only-2026`. */
export function keyPairFromUtf8Seed(utf8Seed: string): {
  privateKey: KeyObject;
  publicKey: KeyObject;
} {
  const privateKey = privateKeyFromSeed(sha256Bytes(utf8Seed));
  return { privateKey, publicKey: createPublicKey(privateKey) };
}

export function publicKeyFromPem(pem: string): KeyObject {
  return createPublicKey(pem);
}

export function publicKeyDer(key: KeyObject): Buffer {
  return key.export({ type: "spki", format: "der" });
}

export function signBytes(privateKey: KeyObject, message: Uint8Array): Buffer {
  return ed25519Sign(null, message, privateKey);
}

export function verifyBytes(
  publicKey: KeyObject,
  message: Uint8Array,
  signature: Uint8Array,
): boolean {
  return ed25519Verify(null, message, publicKey, signature);
}
