import { describe, expect, it } from "vitest";
import { hashAuditRecord, verifyAuditChain, type AuditChainLink } from "./audit-chain.ts";

function record(id: string, prev: string): AuditChainLink {
  const body = { record_id: id, prev_hash: prev };
  return { ...body, record_hash: hashAuditRecord(body) };
}

describe("DEV-12 audit hash chain", () => {
  it("INV-07 a well-formed chain verifies", () => {
    const first = record("aud-1", hashAuditRecord({ record_id: "genesis", prev_hash: "" }));
    const second = record("aud-2", first.record_hash);
    expect(verifyAuditChain([first, second])).toEqual({ ok: true, refs: [] });
  });

  it("INV-07 E03 H05 flipping prev_hash fails verification", () => {
    const first = record("aud-1", hashAuditRecord({ record_id: "genesis", prev_hash: "" }));
    const second = record("aud-2", first.record_hash);
    const tampered: AuditChainLink = { ...second, prev_hash: first.prev_hash };
    const result = verifyAuditChain([first, tampered]);
    expect(result.ok).toBe(false);
    expect(result.refs).toContain("aud-2");
  });

  it("INV-07 recomputing record_hash after a prev_hash flip still fails the chain", () => {
    const first = record("aud-1", hashAuditRecord({ record_id: "genesis", prev_hash: "" }));
    const second = record("aud-2", first.record_hash);
    const flipped = { record_id: second.record_id, prev_hash: first.prev_hash };
    const repaired: AuditChainLink = { ...flipped, record_hash: hashAuditRecord(flipped) };
    expect(verifyAuditChain([first, repaired]).ok).toBe(false);
  });
});
