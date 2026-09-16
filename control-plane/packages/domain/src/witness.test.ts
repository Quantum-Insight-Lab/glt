import { describe, expect, it } from "vitest";
import { GltError } from "./errors.ts";
import { snapshotIsStale } from "./freshness.ts";
import { RUNTIME_IDENTITY } from "./policy.ts";
import {
  PLACEHOLDER_WITNESS_HOST,
  WITNESS_STEP,
  acceptWitnessReceipt,
  assessWitnessFreshness,
  receiptIsExternal,
  requireWitnessEndpoint,
} from "./witness.ts";

const HEAD = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const FRESH = 0;
const TTL = 2;
const STALE_AGE = 3;

const EXTERNAL = {
  receipt_id: "wit-1",
  signature: "ed25519:third-party",
  witness_id: "witness@external",
  head_hash: HEAD,
} as const;

describe("DEV-28 witness freshness and anti-cycle", () => {
  it("is the DEV-28 step", () => {
    expect(WITNESS_STEP).toBe("glt.dev.28");
    expect(PLACEHOLDER_WITNESS_HOST).toBe("example.invalid");
  });

  it("PROTO-12 a missing receipt is stale read-only, not a fresh anchor", () => {
    const none = assessWitnessFreshness({
      ageSeconds: FRESH,
      maxStalenessSeconds: TTL,
    });
    expect(none.anchored).toBe(false);
    expect(none.stale).toBe(true);
    expect(none.write_blocked).toBe(true);
    expect(none.actions_above).toBe("read");
  });

  it("PROTO-12 age past P06 is stale even with an external receipt", () => {
    expect(snapshotIsStale(STALE_AGE, TTL)).toBe(true);
    const late = assessWitnessFreshness({
      ageSeconds: STALE_AGE,
      maxStalenessSeconds: TTL,
      receipt: EXTERNAL,
    });
    expect(late.stale).toBe(true);
    expect(late.write_blocked).toBe(true);
    expect(late.anchored).toBe(false);
  });

  it("an external receipt within P06 is anchored", () => {
    const ok = assessWitnessFreshness({
      ageSeconds: FRESH,
      maxStalenessSeconds: TTL,
      receipt: EXTERNAL,
    });
    expect(ok.anchored).toBe(true);
    expect(ok.stale).toBe(false);
    expect(ok.write_blocked).toBe(false);
  });

  it("INV-09 a self-signed receipt is not an external witness", () => {
    expect(
      receiptIsExternal({ signature: "sig", witness_id: RUNTIME_IDENTITY }),
    ).toBe(false);
    expect(() =>
      acceptWitnessReceipt(
        {
          receipt_id: "wit-self",
          signature: "sig",
          witness_id: RUNTIME_IDENTITY,
          head_hash: HEAD,
        },
        HEAD,
      ),
    ).toThrow(GltError);
    try {
      acceptWitnessReceipt(
        {
          receipt_id: "wit-self",
          signature: "sig",
          witness_id: RUNTIME_IDENTITY,
          head_hash: HEAD,
        },
        HEAD,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(GltError);
      expect((error as GltError).invariant).toBe("INV-09");
    }
  });

  it("INV-09 a green local chain verify is not a witness", () => {
    const localOnly = assessWitnessFreshness({
      ageSeconds: FRESH,
      maxStalenessSeconds: TTL,
      localChainOk: true,
    });
    expect(localOnly.anchored).toBe(false);
    expect(localOnly.write_blocked).toBe(true);
  });

  it("example.invalid is rejected as an endpoint", () => {
    expect(() =>
      requireWitnessEndpoint("https://witness.example.invalid/v1/anchor"),
    ).toThrow(GltError);
    expect(requireWitnessEndpoint("https://witness.test.local/v1/anchor")).toBe(
      "https://witness.test.local/v1/anchor",
    );
  });

  it("a receipt for the wrong head is rejected", () => {
    expect(() => acceptWitnessReceipt({ ...EXTERNAL, head_hash: OTHER }, HEAD)).toThrow(
      GltError,
    );
    expect(acceptWitnessReceipt(EXTERNAL, HEAD).receipt_id).toBe("wit-1");
  });
});
