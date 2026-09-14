import { describe, expect, it } from "vitest";
import { API_HEADER, buildApi } from "@glt/api";
import { Capability, ExitCode, Role, capabilitiesFor } from "@glt/domain";

const READER = {
  [API_HEADER.actor]: "rbac-reader@local",
  [API_HEADER.role]: Role.Reader,
} as const;

describe("DEV-23 HTTP RBAC", () => {
  it("unknown role gets 403 and nothing", async () => {
    const app = buildApi();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/registry",
        headers: { [API_HEADER.actor]: "n@local", [API_HEADER.role]: "not-a-role" },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ code: ExitCode.PolicyDenied });
    } finally {
      await app.close();
    }
  });

  it("missing principal is denied by default", async () => {
    const app = buildApi();
    try {
      const res = await app.inject({ method: "GET", url: "/v1/registry" });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ code: ExitCode.PolicyDenied });
    } finally {
      await app.close();
    }
  });

  it("requester cannot read through GET", async () => {
    const app = buildApi();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/registry",
        headers: { [API_HEADER.actor]: "q@local", [API_HEADER.role]: Role.Requester },
      });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ code: ExitCode.PolicyDenied });
    } finally {
      await app.close();
    }
  });

  it("reader may GET and still cannot request_action", async () => {
    const app = buildApi();
    try {
      const res = await app.inject({ method: "GET", url: "/v1/registry", headers: READER });
      expect(res.statusCode).toBe(200);
      expect(capabilitiesFor(Role.Reader)).not.toContain(Capability.RequestAction);
    } finally {
      await app.close();
    }
  });
});
