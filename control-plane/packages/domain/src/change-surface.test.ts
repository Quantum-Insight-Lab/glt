import { describe, expect, it } from "vitest";
import { digestOf } from "./digest.ts";
import {
  CHANGE_SURFACE_STEP,
  materializedGraphDigest,
  pinBuildFacts,
  projectChangeSurface,
} from "./change-surface.ts";

const DIGEST = digestOf({ n: 1 });

describe("DEV-20 change surface", () => {
  it("S-8 clips by the caller-supplied P03 value, not a domain literal", () => {
    const rows = [
      { id: "a", presence: "both" as const, class: "aligned" as const },
      { id: "b", presence: "intended" as const, class: "expected" as const },
      { id: "c", presence: "materialized" as const, class: "plane_drift" as const },
    ];
    const tight = projectChangeSurface(base({ rows, max_top_level: 1 }));
    const wide = projectChangeSurface(base({ rows, max_top_level: 3 }));
    expect(tight.visible).toHaveLength(1);
    expect(tight.hidden).toBe(2);
    expect(wide.visible).toHaveLength(3);
    expect(wide.hidden).toBe(0);
    expect(tight.visible[0]?.class).toBe("plane_drift");
    expect(CHANGE_SURFACE_STEP).toBe("glt.dev.20");
  });

  it("keeps intended and materialized as two lists and does not merge them", () => {
    const surface = projectChangeSurface(
      base({
        plane: "combined",
        rows: [
          { id: "glt.controlplane.domain", presence: "both", class: "aligned", path: "control-plane/packages/domain" },
          { id: "glt.dev.21", presence: "intended", class: "expected", expected_from_step: "glt.dev.21" },
        ],
      }),
    );
    expect(surface.visible.map((node) => node.presence)).toEqual(["intended", "both"]);
    expect(surface.visible.some((node) => node.class === "expected")).toBe(true);
    expect(surface.visible.some((node) => (node.class as string) === "broken")).toBe(false);
    expect(surface.glyph_layer).toBe("blocked");
  });

  it("PROTO-12 unknown stays visually distinct from healthy in the projection", () => {
    const surface = projectChangeSurface(
      base({
        selected_id: "n",
        rows: [{ id: "n", presence: "both", class: "aligned" }],
        axes: {
          n: [
            { name: "runtime", value: "unknown", provenance: "inference" },
            { name: "verification", value: "passed", provenance: "observation" },
          ],
        },
      }),
    );
    expect(surface.selected?.runtime).toBe("unknown");
    expect(surface.selected?.runtime).not.toBe("healthy");
    expect(surface.selected?.axes.find((axis) => axis.name === "verification")?.value).toBe("passed");
  });

  it("pins git facts without copying module ids into the digest payload keys", () => {
    const pinned = pinBuildFacts({
      sourceDigests: { registry: DIGEST },
      collectorVersions: { intent: "1.0.0", registry: "1.0.0" },
      gitVersion: "1.0.0",
      gitDigests: { workspace: DIGEST },
      graphDigest: materializedGraphDigest({
        commit: "abc",
        coverage: "established",
        nodes: ["control-plane/packages/domain"],
        edges: [],
      }),
    });
    expect(pinned.collectorVersions.git).toBe("1.0.0");
    expect(pinned.sourceDigests["git.workspace"]).toBe(DIGEST);
    expect(pinned.sourceDigests["git.module_graph"]).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(Object.keys(pinned.sourceDigests)).not.toContain("control-plane/packages/domain");
  });
});

function base(
  overrides: Partial<Parameters<typeof projectChangeSurface>[0]> = {},
): Parameters<typeof projectChangeSurface>[0] {
  return {
    snapshot_id: "snap-test",
    snapshot_digest: DIGEST,
    as_of: "2026-08-14T10:00:00Z",
    freshness: "current",
    conflict: "none",
    write_blocked: false,
    plane: "combined",
    max_top_level: 16,
    rows: [],
    axes: {},
    ...overrides,
  };
}
