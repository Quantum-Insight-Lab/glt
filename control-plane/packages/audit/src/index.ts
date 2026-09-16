/**
 * Audit store — DEV-22.
 *
 * Append-only JSONB. Hash chain is domain `hashAuditRecord` / `verifyAuditChain`.
 * Contract: glt-specpack/docs/SPEC/audit.md
 */
export { AUDIT_SCHEMA } from "./schema.ts";
export {
  RETENTION_PARAM,
  STORE_STEP,
  applyAuditSchema,
  auditGenesisPrevHash,
  auditRetentionDays,
  createAuditStore,
  rejectAuditPurge,
} from "./store.ts";
export type { AuditStore } from "./store.ts";
export type { SqlExec } from "./sql.ts";
export { EXPORT_STEP, auditAppendedEvent, exportAuditChain } from "./export.ts";
export type { AuditAppendedEvent, AuditChainExport } from "./export.ts";
export { WITNESS_CLIENT_STEP, createWitnessClient, witnessAnchoredEvent } from "./witness.ts";
export type {
  AnchorRequest,
  AnchorResult,
  WitnessAnchoredEvent,
  WitnessTransport,
} from "./witness.ts";
