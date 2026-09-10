import { ExitCode, GltError } from "@glt/domain";

export const MATERIALIZED_PLANE = "materialized" as const;

const POLICY_KEYS = ["release", "required_checks", "gate", "healthy"] as const;

export function requireMaterializedPlane(plane: string): typeof MATERIALIZED_PLANE {
  if (plane !== MATERIALIZED_PLANE) {
    throw new GltError({
      code: ExitCode.Usage,
      message: "collector facts are materialized only",
      refs: [plane],
    });
  }
  return MATERIALIZED_PLANE;
}

export function reportHasPolicyFields(report: unknown): boolean {
  return collectKeys(report).some((key) => (POLICY_KEYS as readonly string[]).includes(key));
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (value !== null && typeof value === "object") {
    return Object.keys(value).concat(Object.values(value).flatMap(collectKeys));
  }
  return [];
}
