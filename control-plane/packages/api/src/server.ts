/**
 * HTTP API — DEV-21. Composition root. Same artifacts as CLI, same schemas.
 * Body is the artifact. Input versions are headers. Nothing writes the workspace.
 *
 * Contract: glt-specpack/docs/SPEC/api.md
 */
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { collectHealth } from "@glt/cli";
import { intendedSnapshotExtras } from "@glt/collectors";
import { createValidator, validateAgainst, type SchemaName } from "@glt/contracts";
import {
  ExitCode,
  GltError,
  digestOf,
  healthExit,
  isIntendedBoundaryRef,
  usageError,
  type CompiledSnapshot,
} from "@glt/domain";
import { computeImpactFromPaths } from "@glt/impact";
import { compileRegistryFromPaths } from "@glt/registry";
import { compileSnapshotFromPaths, ioFromOptions, resolveRef } from "@glt/snapshot";

export const API_STEP = "glt.dev.21" as const;

export const API_HEADER = {
  snapshotId: "glt-snapshot-id",
  registryVersion: "glt-registry-version",
  snapshotDigest: "glt-snapshot-digest",
  registryDigest: "glt-registry-digest",
  exitCode: "glt-exit-code",
} as const;

export interface InputVersions {
  readonly snapshotId?: string;
  readonly registryVersion?: string;
  readonly snapshotDigest?: string;
  readonly registryDigest?: string;
  readonly exitCode: number;
}

interface QueryBag {
  readonly registry?: string;
  readonly boundary?: string;
  readonly matrix?: string;
  readonly snapshot?: string;
  readonly asOf?: string;
  readonly maxDepth?: string;
  readonly ref?: string;
}

export function buildApi(): FastifyInstance {
  const app = Fastify({ logger: false });
  const ajv = createValidator();

  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "GET" || request.method === "HEAD") return;
    return reply
      .code(405)
      .header("allow", "GET, HEAD")
      .send({
        code: ExitCode.Usage,
        message: "API is read-only; nothing writes the workspace",
      });
  });

  app.setErrorHandler((error: Error, _request, reply) => {
    if (error instanceof GltError) {
      return reply.code(statusFromExit(error.code)).send(error.toJSON());
    }
    const message = error.message.length > 0 ? error.message : "internal error";
    return reply.code(500).send({ code: ExitCode.Internal, message });
  });

  app.get("/v1/registry", async (request, reply) => {
    const q = queryOf(request);
    const compiled = compileRegistryFromPaths({
      ...(q.registry !== undefined ? { bundlePath: q.registry } : {}),
      ...(q.boundary !== undefined ? { boundaryRef: q.boundary } : {}),
    });
    return sendArtifact(reply, compiled, {
      registryVersion: compiled.version,
      registryDigest: digestOf(compiled),
      exitCode: ExitCode.Success,
    });
  });

  app.get("/v1/snapshot", async (request, reply) => {
    const q = queryOf(request);
    const snapshot = compileSnapshotFromPaths(snapshotOptions(q));
    assertSchema(ajv, "snapshot", snapshot);
    return sendArtifact(reply, snapshot, versionsFromSnapshot(snapshot));
  });

  app.get("/v1/impact", async (request, reply) => {
    const q = queryOf(request);
    const report = computeImpactFromPaths({
      ...compileOptions(q),
      ...(q.snapshot !== undefined ? { snapshot: q.snapshot } : {}),
      ...(q.maxDepth !== undefined ? { maxDepth: parseDepth(q.maxDepth) } : {}),
    });
    assertSchema(ajv, "impact-report", report);
    const compiled = compileRegistryFromPaths({
      ...(q.registry !== undefined ? { bundlePath: q.registry } : {}),
      ...(q.boundary !== undefined ? { boundaryRef: q.boundary } : {}),
    });
    return sendArtifact(reply, report, {
      snapshotId: report.snapshot_id,
      snapshotDigest: report.snapshot_digest,
      registryVersion: compiled.version,
      registryDigest: digestOf(compiled),
      exitCode: ExitCode.Success,
    });
  });

  app.get("/v1/health", async (request, reply) => {
    const q = queryOf(request);
    const report = collectHealth({
      ...(q.registry !== undefined ? { registry: q.registry } : {}),
      ...(q.boundary !== undefined ? { boundary: q.boundary } : {}),
      ...(q.snapshot !== undefined ? { snapshot: q.snapshot } : {}),
      ...(q.asOf !== undefined ? { asOf: q.asOf } : {}),
    });
    const compiled = compileRegistryFromPaths({
      ...(q.registry !== undefined ? { bundlePath: q.registry } : {}),
      ...(q.boundary !== undefined ? { boundaryRef: q.boundary } : {}),
    });
    return sendArtifact(reply, report, {
      snapshotId: report.snapshot_id,
      snapshotDigest: report.snapshot_digest,
      registryVersion: compiled.version,
      registryDigest: digestOf(compiled),
      exitCode: healthExit(report),
    });
  });

  app.get("/v1/resolve", async (request, reply) => {
    const q = queryOf(request);
    if (q.ref === undefined) throw usageError("GET /v1/resolve requires ref");
    const resolved = resolveRef(
      q.ref,
      ioFromOptions({
        ...(q.registry !== undefined ? { registry: q.registry } : {}),
        ...(q.boundary !== undefined ? { boundary: q.boundary } : {}),
      }),
    );
    const compiled = compileRegistryFromPaths({
      ...(q.registry !== undefined ? { bundlePath: q.registry } : {}),
      ...(q.boundary !== undefined ? { boundaryRef: q.boundary } : {}),
    });
    return sendArtifact(reply, resolved, {
      registryVersion: compiled.version,
      registryDigest: digestOf(compiled),
      exitCode: ExitCode.Success,
    });
  });

  return app;
}

export function assertSchema(
  ajv: ReturnType<typeof createValidator>,
  name: SchemaName,
  doc: unknown,
): void {
  const problems = validateAgainst(ajv, name, doc);
  if (problems.length > 0) {
    throw new GltError({
      code: ExitCode.ContractInvalid,
      message: problems.map((item) => `${item.path} ${item.message}`).join("; "),
    });
  }
}

export function statusFromExit(code: number): number {
  if (code === ExitCode.Usage) return 400;
  if (code === ExitCode.ContractInvalid) return 422;
  if (code === ExitCode.InvariantViolation) return 409;
  if (code === ExitCode.PolicyDenied) return 403;
  if (code === ExitCode.EvidenceInsufficient) return 409;
  if (code === ExitCode.SourceConflict) return 409;
  return 500;
}

function sendArtifact(reply: FastifyReply, body: unknown, versions: InputVersions): FastifyReply {
  if (versions.snapshotId !== undefined) reply.header(API_HEADER.snapshotId, versions.snapshotId);
  if (versions.registryVersion !== undefined) {
    reply.header(API_HEADER.registryVersion, versions.registryVersion);
  }
  if (versions.snapshotDigest !== undefined) {
    reply.header(API_HEADER.snapshotDigest, versions.snapshotDigest);
  }
  if (versions.registryDigest !== undefined) {
    reply.header(API_HEADER.registryDigest, versions.registryDigest);
  }
  return reply
    .code(200)
    .header(API_HEADER.exitCode, String(versions.exitCode))
    .type("application/json")
    .send(body);
}

function versionsFromSnapshot(snapshot: CompiledSnapshot): InputVersions {
  const registryDigest = snapshot.source_digests["registry"];
  return {
    snapshotId: snapshot.snapshot_id,
    registryVersion: snapshot.registry_version,
    snapshotDigest: snapshot.digest,
    ...(typeof registryDigest === "string" ? { registryDigest } : {}),
    exitCode: ExitCode.Success,
  };
}

function snapshotOptions(q: QueryBag) {
  return {
    ...compileOptions(q),
    ...(isIntendedBoundaryRef(q.boundary) ? intendedSnapshotExtras() : {}),
  };
}

function compileOptions(q: QueryBag) {
  return {
    ...(q.registry !== undefined ? { registry: q.registry } : {}),
    ...(q.boundary !== undefined ? { boundary: q.boundary } : {}),
    ...(q.matrix !== undefined ? { matrix: q.matrix } : {}),
    ...(q.asOf !== undefined ? { asOf: q.asOf } : {}),
  };
}

function queryOf(request: FastifyRequest): QueryBag {
  const raw = request.query;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const rec = raw as Record<string, unknown>;
  const registry = str(rec, "registry");
  const boundary = str(rec, "boundary");
  const matrix = str(rec, "matrix");
  const snapshot = str(rec, "snapshot");
  const asOf = str(rec, "as-of");
  const maxDepth = str(rec, "max-depth");
  const ref = str(rec, "ref");
  return {
    ...(registry !== undefined ? { registry } : {}),
    ...(boundary !== undefined ? { boundary } : {}),
    ...(matrix !== undefined ? { matrix } : {}),
    ...(snapshot !== undefined ? { snapshot } : {}),
    ...(asOf !== undefined ? { asOf } : {}),
    ...(maxDepth !== undefined ? { maxDepth } : {}),
    ...(ref !== undefined ? { ref } : {}),
  };
}

function str(rec: Record<string, unknown>, key: string): string | undefined {
  const value = rec[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseDepth(raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value)) throw usageError("invalid max-depth", [raw]);
  return value;
}
