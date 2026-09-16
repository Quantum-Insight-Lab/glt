import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { apiBind } from "@glt/api";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import { PACK, REPO_ROOT, loadYaml, readText } from "@glt/contracts";
import { isPinnedImageRef } from "@glt/domain";

const COMPOSE_STEP = "glt.dev.25" as const;

const DEPLOY = join(REPO_ROOT, "deploy");
const COMPOSE_PATH = join(DEPLOY, "compose.yaml");
const DOCKERFILE_PATH = join(DEPLOY, "Dockerfile");
const EXAMPLE_PATH = join(DEPLOY, ".env.example");
const SECRET_ASSIGN =
  /(?:PASSWORD|SECRET|TOKEN|API[_-]?KEY)\s*[:=]\s*(["']?)(?!\$\{)([^"'#\s]+)\1/gi;
const REQUIRED_SERVICES = ["api", "postgres", "redis", "otel-collector"] as const;

interface ComposeService {
  readonly image?: string;
  readonly build?: unknown;
  readonly ports?: readonly unknown[];
}

interface ComposeFile {
  readonly services?: Record<string, ComposeService>;
}

function composeDoc(): ComposeFile {
  return loadYaml<ComposeFile>(COMPOSE_PATH);
}

function pulledImageRefs(doc: ComposeFile): string[] {
  return Object.values(doc.services ?? {}).flatMap((service) => {
    if (service.build !== undefined || typeof service.image !== "string") return [];
    return [service.image];
  });
}

function fromRefs(dockerfile: string): string[] {
  return [...dockerfile.matchAll(/^FROM\s+(\S+)/gm)].flatMap((match) => {
    const ref = match[1];
    return ref === undefined ? [] : [ref];
  });
}

function unpinned(refs: readonly string[]): string[] {
  return refs.filter((ref) => !isPinnedImageRef(ref));
}

function publishedPorts(doc: ComposeFile): string[] {
  return Object.values(doc.services ?? {}).flatMap((service) =>
    (service.ports ?? []).flatMap((port) => (typeof port === "string" ? [port] : [])),
  );
}

function hostUnbound(ports: readonly string[]): string[] {
  return ports.filter((port) => !port.startsWith("127.0.0.1:"));
}

function withoutInterpolation(text: string): string {
  return text.replace(/\$\{[^}]+\}/g, "");
}

function literalSecrets(text: string): string[] {
  return [...withoutInterpolation(text).matchAll(SECRET_ASSIGN)].flatMap((match) => {
    const value = match[2];
    return value === undefined || value.length === 0 ? [] : [value];
  });
}

function mentionsGltDeploy(text: string): boolean {
  return /\bglt\s+deploy\b/.test(text);
}

function deployTreeTexts(): string[] {
  return readdirSync(DEPLOY).flatMap((name) => {
    if (name === ".env") return [];
    return [readFileSync(join(DEPLOY, name), "utf8")];
  });
}

describe("DEV-25 Compose deployment", () => {
  it("is the DEV-25 step", () => {
    expect(COMPOSE_STEP).toBe("glt.dev.25");
    expect(existsSync(COMPOSE_PATH)).toBe(true);
  });

  it("PROTO-10 pulled images and FROM are pinned by digest", () => {
    const pulled = pulledImageRefs(composeDoc());
    const from = fromRefs(readText(DOCKERFILE_PATH));
    expect(pulled.length).toBeGreaterThan(0);
    expect(from.length).toBeGreaterThan(0);
    expect(unpinned([...pulled, ...from])).toEqual([]);
    expect(readText(COMPOSE_PATH)).not.toMatch(/:latest\b/);
  });

  it("PROTO-10 a tag without digest fails the pin check", () => {
    const broken = pulledImageRefs({
      services: { postgres: { image: "postgres:16-alpine" } },
    });
    expect(unpinned(broken)).toEqual(["postgres:16-alpine"]);
    expect(unpinned(pulledImageRefs(composeDoc()))).toEqual([]);
  });

  it("required services are api, postgres, redis, otel-collector", () => {
    const names = Object.keys(composeDoc().services ?? {});
    expect(names.sort()).toEqual([...REQUIRED_SERVICES].sort());
  });

  it("host publishes only 127.0.0.1", () => {
    const ports = publishedPorts(composeDoc());
    expect(ports.length).toBeGreaterThan(0);
    expect(hostUnbound(ports)).toEqual([]);
    expect(hostUnbound(["4174:4174"])).toEqual(["4174:4174"]);
  });

  it("default API bind stays 127.0.0.1; Compose sets HOST", () => {
    expect(apiBind({})).toEqual({ host: "127.0.0.1", port: 4174 });
    expect(apiBind({ HOST: "0.0.0.0", PORT: "4174" })).toEqual({
      host: "0.0.0.0",
      port: 4174,
    });
  });

  it("secrets are interpolated, not stored", () => {
    expect(readText(join(REPO_ROOT, ".gitignore"))).toMatch(/^\.env$/m);
    expect(readText(join(REPO_ROOT, ".gitignore"))).toContain("!.env.example");
    const example = readText(EXAMPLE_PATH);
    expect(example).toMatch(/^POSTGRES_PASSWORD=\s*$/m);
    expect(literalSecrets(example)).toEqual([]);
    expect(literalSecrets(readText(COMPOSE_PATH))).toEqual([]);
    for (const text of deployTreeTexts()) {
      expect(literalSecrets(text)).toEqual([]);
    }
    const leaked = readText(COMPOSE_PATH).replace(
      "${POSTGRES_PASSWORD:?set in deploy/.env}",
      "hunter2",
    );
    expect(literalSecrets(leaked)).toContain("hunter2");
  });

  it("S-10 glt deploy is not a command and is not the compose path", () => {
    expect(FORBIDDEN_COMMANDS).toContain("deploy");
    expect(COMMANDS.map((command) => command.name)).not.toContain("deploy");
    const selfHost = readText(join(PACK.docs, "SPEC", "self-hosting.md"));
    const cli = readText(join(PACK.docs, "SPEC", "cli.md"));
    expect(mentionsGltDeploy(readText(COMPOSE_PATH))).toBe(false);
    expect(mentionsGltDeploy(selfHost)).toBe(false);
    expect(mentionsGltDeploy(cli)).toBe(false);
    expect(mentionsGltDeploy("then run glt deploy")).toBe(true);
    expect(existsSync(join(REPO_ROOT, "compose.yaml"))).toBe(false);
    expect(existsSync(join(REPO_ROOT, "docker-compose.yml"))).toBe(false);
  });
});
