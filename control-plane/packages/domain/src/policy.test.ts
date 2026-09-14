import { describe, expect, it } from "vitest";
import { ExitCode, GltError } from "./errors.ts";
import {
  Capability,
  POLICY_STEP,
  RUNTIME_IDENTITY,
  Role,
  authorize,
  capabilitiesFor,
} from "./policy.ts";

describe("DEV-23 RBAC authorize", () => {
  it("is the DEV-23 step", () => {
    expect(POLICY_STEP).toBe("glt.dev.23");
  });

  it("unknown role is denied by default", () => {
    expect(capabilitiesFor("not-a-role")).toEqual([]);
    expectDenied(() =>
      authorize({
        principal: { actor: "guest@local", role: "not-a-role" },
        capability: Capability.Read,
      }),
    );
  });

  it("missing principal is denied by default", () => {
    expectDenied(() => authorize({ principal: undefined, capability: Capability.Read }));
    expectDenied(() =>
      authorize({ principal: { actor: "  ", role: Role.Reader }, capability: Capability.Read }),
    );
  });

  it("read and request_action are separate capabilities", () => {
    expect(capabilitiesFor(Role.Reader)).toEqual([Capability.Read]);
    expect(capabilitiesFor(Role.Requester)).toEqual([Capability.RequestAction]);
    expect(capabilitiesFor(Role.Reader)).not.toContain(Capability.RequestAction);
    expect(capabilitiesFor(Role.Requester)).not.toContain(Capability.Read);

    authorize({
      principal: { actor: "r@local", role: Role.Reader },
      capability: Capability.Read,
    });
    expectDenied(() =>
      authorize({
        principal: { actor: "r@local", role: Role.Reader },
        capability: Capability.RequestAction,
      }),
    );
    expectDenied(() =>
      authorize({
        principal: { actor: "q@local", role: Role.Requester },
        capability: Capability.Read,
      }),
    );
    authorize({
      principal: { actor: "q@local", role: Role.Requester },
      capability: Capability.RequestAction,
    });
  });

  it("INV-09 author cannot approve own plan even with approver role", () => {
    expectDenied(
      () =>
        authorize({
          principal: { actor: "alice@local", role: Role.Approver },
          capability: Capability.Approve,
          plan: { authored_by: "alice@local" },
        }),
      "INV-09",
    );
  });

  it("INV-09 control-plane runtime cannot approve own release", () => {
    expectDenied(
      () =>
        authorize({
          principal: { actor: RUNTIME_IDENTITY, role: Role.Approver },
          capability: Capability.Approve,
          plan: { authored_by: "builder@external", affects_control_plane_release: true },
        }),
      "INV-09",
    );
  });

  it("INV-09 llm cannot approve", () => {
    expect(capabilitiesFor(Role.Llm)).toEqual([]);
    expectDenied(() =>
      authorize({
        principal: { actor: "model@local", role: Role.Llm },
        capability: Capability.Approve,
        plan: { authored_by: "other@local" },
      }),
    );
  });

  it("an external approver may approve a plan they did not author", () => {
    authorize({
      principal: { actor: "reviewer@external", role: Role.Approver },
      capability: Capability.Approve,
      plan: { authored_by: "alice@local", affects_control_plane_release: true },
    });
  });

  it("granting read to an unknown role would fail the default-deny test", () => {
    const leaked = capabilitiesFor("unknown");
    expect(leaked.includes(Capability.Read)).toBe(false);
    expect(leaked.includes(Capability.RequestAction)).toBe(false);
    expect(leaked.includes(Capability.Approve)).toBe(false);
  });
});

function expectDenied(run: () => void, invariant?: string): void {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(GltError);
  const err = caught as GltError;
  expect(err.code).toBe(ExitCode.PolicyDenied);
  if (invariant !== undefined) expect(err.invariant).toBe(invariant);
}
