import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { EventType, PACK, REPO_ROOT, loadYaml } from "@glt/contracts";

const SRC_ROOT = join(REPO_ROOT, "control-plane");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      return entry === "node_modules" || entry === "generated" ? [] : sourceFiles(p);
    }
    return p.endsWith(".ts") ? [p] : [];
  });
}

interface EventRegistry {
  metadata: { registry_version: string };
  spec: { events: { type: string; invariants: string[] }[] };
}

const registry = loadYaml<EventRegistry>(PACK.eventRegistry);
const registeredTypes = registry.spec.events.map((e) => e.type);

describe("S-3 Event Registry is the only source of event names", () => {
  it("S-3 generated constants cover exactly the registry", () => {
    expect(Object.values(EventType).sort()).toEqual([...registeredTypes].sort());
  });

  it("S-3 no event name appears as a string literal outside generated code", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(SRC_ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const type of registeredTypes) {
        // The registry itself and this test legitimately mention the names.
        if (file.endsWith("s3-event-registry.test.ts")) continue;
        if (text.includes(`"${type}"`) || text.includes(`'${type}'`)) {
          offenders.push(`${relative(REPO_ROOT, file)}: ${type}`);
        }
      }
    }

    expect(offenders.join("\n")).toBe("");
  });

  it("S-3 every event names at least one invariant", () => {
    const naked = registry.spec.events.filter((e) => e.invariants.length === 0).map((e) => e.type);
    expect(naked).toEqual([]);
  });
});
