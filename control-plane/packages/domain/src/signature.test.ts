import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACK } from "@glt/contracts";
import { join } from "node:path";
import { keyPairFromUtf8Seed, publicKeyDer, publicKeyFromPem } from "./signature.ts";

describe("T0 key derivation matches the committed public key", () => {
  it("INV-10 glt-dev-only-2026 public key is sha256 of the published seed", () => {
    const { publicKey } = keyPairFromUtf8Seed("glt-dev-only-2026");
    const committed = publicKeyFromPem(
      readFileSync(join(PACK.seedKeys, "glt-dev-only-2026.pub"), "utf8"),
    );
    expect(publicKeyDer(publicKey).equals(publicKeyDer(committed))).toBe(true);
  });
});
