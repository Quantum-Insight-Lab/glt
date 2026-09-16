import { describe, expect, it } from "vitest";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import { EventType, loadParameterCards } from "@glt/contracts";
import {
  ExitCode,
  GltError,
  RUNTIME_IDENTITY,
  WITNESS_STEP,
  assessWitnessFreshness,
  parameterSpecFromCard,
  parameterValue,
  requireWitnessEndpoint,
  hashAuditRecord,
  verifyAuditChain,
} from "@glt/domain";
import { createWitnessClient, witnessAnchoredEvent } from "@glt/audit";

const HEAD = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ENDPOINT = "https://witness.test.local/v1/anchor";
const P06 = "glt.param.witness.max_staleness_seconds";

describe("DEV-28 external witness client", () => {
  it("is the DEV-28 step", () => {
    expect(WITNESS_STEP).toBe("glt.dev.28");
  });

  it("anchors a head-hash at a third party and saves the receipt", async () => {
    const saved: unknown[] = [];
    const client = createWitnessClient(ENDPOINT, {
      async post(url, body) {
        expect(url).toBe(ENDPOINT);
        expect(body.head_hash).toBe(HEAD);
        return {
          receipt_id: "wit-live",
          signature: "ed25519:third-party",
          witness_id: "anchor@external",
          head_hash: body.head_hash,
        };
      },
      save(receipt) {
        saved.push(receipt);
      },
    });
    const result = await client.anchor({
      head_hash: HEAD,
      chain_id: "glt-audit-main",
      timestamp: "2026-09-16T03:00:00Z",
    });
    expect(saved).toEqual([result.receipt]);
    expect(result.event.event_type).toBe(EventType.WitnessAnchored);
    expect(result.event).toEqual(witnessAnchoredEvent(result.receipt));
    expect(
      assessWitnessFreshness({
        ageSeconds: 0,
        maxStalenessSeconds: parameterP06(),
        receipt: result.receipt,
      }).anchored,
    ).toBe(true);
  });

  it("PROTO-12 a witness older than P06 is read-only", () => {
    const p06 = parameterP06();
    const late = assessWitnessFreshness({
      ageSeconds: p06 + 1,
      maxStalenessSeconds: p06,
      receipt: {
        receipt_id: "wit-old",
        signature: "ed25519:third-party",
        witness_id: "anchor@external",
        head_hash: HEAD,
      },
    });
    expect(late.write_blocked).toBe(true);
    expect(late.stale).toBe(true);
  });

  it("rejects the example.invalid placeholder", () => {
    expect(() =>
      requireWitnessEndpoint("https://witness.example.invalid/v1/anchor"),
    ).toThrow(GltError);
    expect(() =>
      createWitnessClient("https://witness.example.invalid/v1/anchor", {
        async post() {
          return {};
        },
        save() {},
      }),
    ).toThrow(GltError);
  });

  it("INV-09 a local chain verify does not count as a witness", () => {
    const prev = hashAuditRecord({ record_id: "genesis", prev_hash: "" });
    const link = { record_id: "aud-1", prev_hash: prev };
    const record_hash = hashAuditRecord(link);
    const local = verifyAuditChain([{ ...link, record_hash }]);
    expect(local.ok).toBe(true);
    const assessment = assessWitnessFreshness({
      ageSeconds: 0,
      maxStalenessSeconds: parameterP06(),
      localChainOk: local.ok,
    });
    expect(assessment.anchored).toBe(false);
    expect(assessment.write_blocked).toBe(true);
  });

  it("INV-09 the runtime cannot be the witness", async () => {
    const client = createWitnessClient(ENDPOINT, {
      async post() {
        return {
          receipt_id: "wit-self",
          signature: "ed25519:self",
          witness_id: RUNTIME_IDENTITY,
          head_hash: HEAD,
        };
      },
      save() {
        throw new Error("must not save a self receipt");
      },
    });
    let caught: unknown;
    try {
      await client.anchor({
        head_hash: HEAD,
        chain_id: "glt-audit-main",
        timestamp: "2026-09-16T03:00:00Z",
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GltError);
    expect((caught as GltError).invariant).toBe("INV-09");
    expect((caught as GltError).code).toBe(ExitCode.InvariantViolation);
  });

  it("S-10 glt witness is not a command", () => {
    const names = COMMANDS.map((command) => command.name);
    expect(names).not.toContain("witness");
    expect(names).not.toContain("anchor");
    expect(FORBIDDEN_COMMANDS).not.toContain("witness");
  });
});

function parameterP06(): number {
  for (const card of loadParameterCards()) {
    const spec = parameterSpecFromCard(card);
    if (spec.id === P06) return parameterValue(spec);
  }
  throw new Error("P06 missing");
}
