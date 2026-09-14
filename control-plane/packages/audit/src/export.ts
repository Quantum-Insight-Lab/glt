/**
 * Audit chain export (DEV-24). Projects stored records. Emits
 * EventType.AuditAppended — the name comes from the registry (S-3).
 *
 * Contract: glt-specpack/docs/SPEC/audit.md
 */
import { EVENT_SCHEMA_VERSION, EventType, type AuditRecord } from "@glt/contracts";
import { TELEMETRY_STEP, scrubTelemetry } from "@glt/domain";

export const EXPORT_STEP = TELEMETRY_STEP;

export interface AuditAppendedEvent {
  readonly event_type: typeof EventType.AuditAppended;
  readonly schema_version: number;
  readonly payload: {
    readonly record_id: string;
    readonly prev_hash: string;
  };
}

export interface AuditChainExport {
  readonly records: readonly Record<string, unknown>[];
  readonly events: readonly AuditAppendedEvent[];
}

export function exportAuditChain(records: readonly AuditRecord[]): AuditChainExport {
  return {
    records: records.map((record) =>
      scrubTelemetry({
        record_id: record.record_id,
        prev_hash: record.prev_hash,
      }).payload,
    ),
    events: records.map(auditAppendedEvent),
  };
}

export function auditAppendedEvent(record: AuditRecord): AuditAppendedEvent {
  return {
    event_type: EventType.AuditAppended,
    schema_version: EVENT_SCHEMA_VERSION[EventType.AuditAppended],
    payload: { record_id: record.record_id, prev_hash: record.prev_hash },
  };
}
