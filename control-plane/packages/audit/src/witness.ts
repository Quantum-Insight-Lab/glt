/**
 * External witness client (DEV-28). Posts the audit head, saves the
 * receipt. Endpoint and receipt checks are domain. Transport is injected.
 *
 * Contract: glt-specpack/docs/SECURITY/external-witness.md
 */

import { EVENT_SCHEMA_VERSION, EventType } from "@glt/contracts";
import {
  acceptWitnessReceipt,
  contractInvalid,
  requireWitnessEndpoint,
  type WitnessReceiptView,
} from "@glt/domain";

export const WITNESS_CLIENT_STEP = "glt.dev.28" as const;

export interface AnchorRequest {
  readonly head_hash: string;
  readonly chain_id: string;
  readonly timestamp: string;
}

export interface WitnessAnchoredEvent {
  readonly event_type: typeof EventType.WitnessAnchored;
  readonly schema_version: number;
  readonly payload: {
    readonly head_hash: string;
    readonly witness_id: string;
    readonly receipt_id: string;
  };
}

export interface AnchorResult {
  readonly receipt: WitnessReceiptView;
  readonly event: WitnessAnchoredEvent;
}

export interface WitnessTransport {
  readonly post: (url: string, body: AnchorRequest) => Promise<unknown>;
  readonly save: (receipt: WitnessReceiptView) => void;
}

export function createWitnessClient(
  endpoint: string,
  transport: WitnessTransport,
): { readonly anchor: (request: AnchorRequest) => Promise<AnchorResult> } {
  const url = requireWitnessEndpoint(endpoint);
  return {
    async anchor(request) {
      const raw = await transport.post(url, request);
      const receipt = acceptWitnessReceipt(asReceipt(raw, request.head_hash), request.head_hash);
      transport.save(receipt);
      return { receipt, event: witnessAnchoredEvent(receipt) };
    },
  };
}

export function witnessAnchoredEvent(receipt: WitnessReceiptView): WitnessAnchoredEvent {
  return {
    event_type: EventType.WitnessAnchored,
    schema_version: EVENT_SCHEMA_VERSION[EventType.WitnessAnchored],
    payload: {
      head_hash: receipt.head_hash,
      witness_id: receipt.witness_id,
      receipt_id: receipt.receipt_id,
    },
  };
}

function asReceipt(raw: unknown, headHash: string): WitnessReceiptView {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw contractInvalid("witness response is not an object");
  }
  const rec = raw as Record<string, unknown>;
  return {
    receipt_id: asString(rec["receipt_id"], "receipt_id"),
    signature: asString(rec["signature"], "signature"),
    witness_id: asString(rec["witness_id"], "witness_id"),
    head_hash:
      typeof rec["head_hash"] === "string" && rec["head_hash"].trim().length > 0
        ? rec["head_hash"].trim()
        : headHash,
  };
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw contractInvalid(`witness response missing ${field}`, [field]);
  }
  return value.trim();
}
