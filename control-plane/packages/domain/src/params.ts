import { contractInvalid } from "./errors.ts";

/**
 * The parameter loader (S-4, S-8). Pure: cards arrive already parsed.
 * Reading YAML from `parameters/` is I/O and lives in contracts.
 */

export interface ParameterSpec {
  readonly id: string;
  readonly default: number;
  readonly min: number;
  readonly max: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parameterSpecFromCard(card: unknown): ParameterSpec {
  if (!isRecord(card)) throw contractInvalid("parameter card is not an object");
  const metadata = card["metadata"];
  const spec = card["spec"];
  if (!isRecord(metadata) || typeof metadata["id"] !== "string") {
    throw contractInvalid("parameter card missing metadata.id");
  }
  if (!isRecord(spec) || typeof spec["default"] !== "number") {
    throw contractInvalid("parameter card missing numeric spec.default", [metadata["id"]]);
  }
  const range = spec["range"];
  if (!isRecord(range) || typeof range["min"] !== "number" || typeof range["max"] !== "number") {
    throw contractInvalid("parameter card missing spec.range.min/max", [metadata["id"]]);
  }
  return {
    id: metadata["id"],
    default: spec["default"],
    min: range["min"],
    max: range["max"],
  };
}

export function parameterValue(
  spec: ParameterSpec,
  override: number | undefined = undefined,
): number {
  const value = override === undefined ? spec.default : override;
  if (value < spec.min || value > spec.max) {
    throw contractInvalid(`parameter ${spec.id} out of range`, [spec.id]);
  }
  return value;
}
