/**
 * RBAC (DEV-23). Pure: the principal and the plan arrive already parsed.
 * Deny by default. The allowlist is this module; a caller cannot add a
 * capability. Hash and I/O stay elsewhere (S-1, S-4).
 *
 * Contract: glt-specpack/docs/SPEC/policy.md
 */

import { policyDenied } from "./errors.ts";

export const POLICY_STEP = "glt.dev.23" as const;

export const Capability = {
  Read: "read",
  RequestAction: "request_action",
  Approve: "approve",
} as const;

export type Capability = (typeof Capability)[keyof typeof Capability];

export const Role = {
  Reader: "reader",
  Requester: "requester",
  Approver: "approver",
  Llm: "llm",
} as const;

/** Runtime identity from docs/SECURITY/approvals.md. Cannot approve. */
export const RUNTIME_IDENTITY = "glt-cp-runtime@internal" as const;

export interface Principal {
  readonly actor: string;
  readonly role: string;
}

export interface PlanSubject {
  readonly authored_by: string;
  readonly affects_control_plane_release?: boolean;
}

export interface AuthorizeInput {
  readonly principal: Principal | undefined;
  readonly capability: Capability;
  readonly plan?: PlanSubject;
  /** Defaults to the runtime identity. */
  readonly forbiddenApprovers?: readonly string[];
}

const ROLE_CAPABILITIES: Readonly<Record<string, readonly Capability[]>> = {
  [Role.Reader]: [Capability.Read],
  [Role.Requester]: [Capability.RequestAction],
  [Role.Approver]: [Capability.Approve],
  [Role.Llm]: [],
};

export function capabilitiesFor(role: string): readonly Capability[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

/**
 * Fail-closed. Unknown role, missing principal, or a capability the role
 * does not hold → policy denied. Approve is further closed by INV-09.
 */
export function authorize(input: AuthorizeInput): void {
  const principal = input.principal;
  if (principal === undefined || principal.actor.trim() === "" || principal.role.trim() === "") {
    throw policyDenied("denied by default: no principal", ["principal"]);
  }

  const held = capabilitiesFor(principal.role);
  if (!held.includes(input.capability)) {
    throw policyDenied("denied by default: role lacks capability", [
      principal.role,
      input.capability,
    ]);
  }

  if (input.capability !== Capability.Approve) return;

  const forbidden = input.forbiddenApprovers ?? [RUNTIME_IDENTITY];
  if (forbidden.includes(principal.actor) || principal.actor === RUNTIME_IDENTITY) {
    throw policyDenied("control plane cannot approve", [principal.actor], "INV-09");
  }
  if (input.plan !== undefined && principal.actor === input.plan.authored_by) {
    throw policyDenied("role cannot approve its own plan", [principal.actor], "INV-09");
  }
}
