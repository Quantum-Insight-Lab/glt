import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { API_HEADER, API_STEP, assertSchema, buildApi } from "@glt/api";
import { collectHealth } from "@glt/cli";
import { REPO_ROOT, createValidator, validateAgainst } from "@glt/contracts";
import { computeImpactFromPaths } from "@glt/impact";
import { compileRegistryFromPaths } from "@glt/registry";
import { compileSnapshotFromPaths, ioFromOptions, resolveRef } from "@glt/snapshot";

const AS_OF = "2026-08-14T10:00:00Z";
const GOLDEN = "glt-specpack/contracts/examples/golden/bootstrap-snapshot.json";
const WRITE_PROBE = join(REPO_ROOT, ".glt-api-write-probe");

async function withApi<T>(run: (app: ReturnType<typeof buildApi>) => Promise<T>): Promise<T> {
  const app = buildApi();
  try {
    return await run(app);
  } finally {
    await app.close();
  }
}

describe("DEV-21 HTTP API", () => {
  it("is the DEV-21 step", () => {
    expect(API_STEP).toBe("glt.dev.21");
  });

  it("S-4 GET /v1/snapshot body equals glt compile snapshot JSON", async () => {
    const expected = compileSnapshotFromPaths({ asOf: AS_OF });
    await withApi(async (app) => {
      const res = await app.inject({ method: "GET", url: `/v1/snapshot?as-of=${AS_OF}` });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(expected);
      expect(res.headers[API_HEADER.snapshotId]).toBe(expected.snapshot_id);
      expect(res.headers[API_HEADER.registryVersion]).toBe(expected.registry_version);
      expect(res.headers[API_HEADER.snapshotDigest]).toBe(expected.digest);
      expect(res.headers[API_HEADER.registryDigest]).toBe(expected.source_digests["registry"]);
      expect(res.headers[API_HEADER.exitCode]).toBe("0");
    });
  });

  it("validates the snapshot with the same schema as CLI", async () => {
    const ajv = createValidator();
    await withApi(async (app) => {
      const res = await app.inject({ method: "GET", url: `/v1/snapshot?as-of=${AS_OF}` });
      expect(validateAgainst(ajv, "snapshot", res.json())).toEqual([]);
    });
  });

  it("S-4 wrapping the artifact in an envelope fails the snapshot schema", () => {
    const snapshot = compileSnapshotFromPaths({ asOf: AS_OF });
    const envelope = {
      snapshot_id: snapshot.snapshot_id,
      registry_version: snapshot.registry_version,
      artifact: snapshot,
    };
    const problems = validateAgainst(createValidator(), "snapshot", envelope);
    expect(problems.length).toBeGreaterThan(0);
    expect(() => assertSchema(createValidator(), "snapshot", envelope)).toThrow(/code|required|additional/i);
  });

  it("S-4 GET /v1/impact body equals glt impact JSON", async () => {
    const expected = computeImpactFromPaths({ snapshot: GOLDEN });
    await withApi(async (app) => {
      const res = await app.inject({ method: "GET", url: `/v1/impact?snapshot=${GOLDEN}` });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(expected);
      expect(res.headers[API_HEADER.snapshotId]).toBe(expected.snapshot_id);
      expect(res.headers[API_HEADER.snapshotDigest]).toBe(expected.snapshot_digest);
      expect(validateAgainst(createValidator(), "impact-report", res.json())).toEqual([]);
    });
  });

  it("S-4 GET /v1/registry body equals glt compile registry JSON", async () => {
    const expected = compileRegistryFromPaths();
    await withApi(async (app) => {
      const res = await app.inject({ method: "GET", url: "/v1/registry" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(expected);
      expect(res.headers[API_HEADER.registryVersion]).toBe(expected.version);
    });
  });

  it("S-4 GET /v1/health body equals glt health JSON", async () => {
    const expected = collectHealth({ snapshot: GOLDEN, asOf: AS_OF });
    await withApi(async (app) => {
      const res = await app.inject({
        method: "GET",
        url: `/v1/health?snapshot=${GOLDEN}&as-of=${AS_OF}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(expected);
      expect(res.headers[API_HEADER.snapshotId]).toBe(expected.snapshot_id);
      expect(res.headers[API_HEADER.snapshotDigest]).toBe(expected.snapshot_digest);
    });
  });

  it("S-4 GET /v1/resolve body equals glt resolve JSON", async () => {
    const ref = "glt-specpack/docs/SPEC/registry.md";
    const expected = resolveRef(ref, ioFromOptions());
    await withApi(async (app) => {
      const res = await app.inject({ method: "GET", url: `/v1/resolve?ref=${encodeURIComponent(ref)}` });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(expected);
    });
  });

  it("S-5 POST is rejected and does not write the workspace", async () => {
    expect(existsSync(WRITE_PROBE)).toBe(false);
    await withApi(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/snapshot",
        payload: { path: WRITE_PROBE, body: "no" },
      });
      expect(res.statusCode).toBe(405);
      expect(res.json()).toMatchObject({ code: 1 });
    });
    expect(existsSync(WRITE_PROBE)).toBe(false);
  });

  it("S-5 api sources do not call filesystem writes", () => {
    const root = join(REPO_ROOT, "control-plane/packages/api/src");
    const texts = srcTexts(root);
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).not.toMatch(/writeFile|appendFile|renameSync|rmSync|mkdirSync/);
    }
  });
});

function srcTexts(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return srcTexts(path);
    return entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")
      ? [readFileSync(path, "utf8")]
      : [];
  });
}
