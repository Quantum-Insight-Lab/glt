import { describe, expect, it } from "vitest";
import { PACK, loadSeedPublicKeys, loadYaml } from "@glt/contracts";
import {
  BOOTSTRAP_FAILURE,
  GltError,
  canonicalize,
  keyPairFromUtf8Seed,
  publicKeyDer,
  signBytes,
  stripSignature,
  verifyBootstrapManifest,
} from "@glt/domain";
import { verifyBootstrap, run } from "@glt/cli";

const DEV_SEED = "glt-dev-only-2026";

function asError(run: () => unknown): GltError {
  try {
    run();
  } catch (error) {
    if (error instanceof GltError) return error;
    throw error;
  }
  throw new Error("expected GltError");
}

describe("INV-10 bootstrap trust termination", () => {
  it("INV-10 committed manifest verifies against T0 keys loaded from seed-public-keys/", () => {
    const result = verifyBootstrapManifest(loadSeedPublicKeys(), loadYaml(PACK.bootstrapManifest));
    expect(result.keyId).toBe(DEV_SEED);
    expect(result.payloadDigest.startsWith("sha256:")).toBe(true);
  });

  it("INV-10 loads T0 keys before parsing the manifest", () => {
    const order: string[] = [];
    let manifestRead = false;
    verifyBootstrap({
      loadSeedKeys: () => {
        expect(manifestRead).toBe(false);
        order.push("load-t0");
        return loadSeedPublicKeys();
      },
      loadManifest: () => {
        manifestRead = true;
        order.push("parse-manifest");
        return loadYaml(PACK.bootstrapManifest);
      },
    });
    expect(order).toEqual(["load-t0", "parse-manifest"]);
  });

  it("INV-10 glt verify succeeds on the committed pack and names the three steps", async () => {
    const result = await run(["verify", "-o", "json"]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    const report = JSON.parse(result.stdout) as {
      ok: boolean;
      order: string[];
      keyId: string;
    };
    expect(report.ok).toBe(true);
    expect(report.keyId).toBe(DEV_SEED);
    expect(report.order).toEqual(["load-t0", "parse-manifest", "verify-signature"]);
  });

  it("INV-10 rejects a manifest signed only by a key embedded in it", () => {
    const stranger = keyPairFromUtf8Seed("not-a-t0-key");
    const pem = `-----BEGIN PUBLIC KEY-----\n${publicKeyDer(stranger.publicKey).toString("base64")}\n-----END PUBLIC KEY-----`;
    const manifest = structuredClone(loadYaml(PACK.bootstrapManifest)) as {
      spec: { trust_root: Record<string, unknown> };
      metadata: { signature: { alg: string; key_id: string; value: string } };
    };
    manifest.spec.trust_root["public_key"] = pem;
    const payload = stripSignature(manifest);
    manifest.metadata.signature.value = signBytes(
      stranger.privateKey,
      Buffer.from(canonicalize(payload), "utf8"),
    ).toString("base64");

    const error = asError(() => verifyBootstrapManifest([], manifest));
    expect(error.invariant).toBe("INV-10");
    expect(error.refs[0]).toBe(BOOTSTRAP_FAILURE.EmbeddedKey);
    expect(error.code).toBe(3);
  });

  it("INV-10 missing seed key is a distinct refusal from a bad signature", () => {
    const missing = asError(() => verifyBootstrapManifest([], loadYaml(PACK.bootstrapManifest)));
    expect(missing.refs[0]).toBe(BOOTSTRAP_FAILURE.MissingSeedKey);
    expect(missing.code).toBe(5);

    const tampered = structuredClone(loadYaml(PACK.bootstrapManifest)) as {
      metadata: { signature: { value: string } };
    };
    tampered.metadata.signature.value = signBytes(
      keyPairFromUtf8Seed("wrong").privateKey,
      Buffer.from("not the manifest"),
    ).toString("base64");
    const bad = asError(() => verifyBootstrapManifest(loadSeedPublicKeys(), tampered));
    expect(bad.refs[0]).toBe(BOOTSTRAP_FAILURE.BadSignature);
    expect(bad.code).toBe(3);

    expect(missing.refs[0]).not.toBe(bad.refs[0]);
  });
});
