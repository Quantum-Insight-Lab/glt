import { describe, expect, it } from "vitest";
import { renderChangeDashboard } from "@glt/dashboard";
import { assembleChangeView, dashboardMaxTopLevel } from "./change-view.ts";

describe("DEV-20 B1 Change dashboard", () => {
  it("S-5 the markup has no status editor and no write control", () => {
    const html = renderChangeDashboard(assembleChangeView({ plane: "combined" }));
    expect(html).not.toMatch(/<input\b/i);
    expect(html).not.toMatch(/<select\b/i);
    expect(html).not.toMatch(/<textarea\b/i);
    expect(html).not.toMatch(/contenteditable/i);
    expect(html).toContain('data-write="forbidden"');
    expect(html).not.toContain("fetch(");
  });

  it("PROTO-12 unknown is labeled differently from healthy", () => {
    const html = renderChangeDashboard(
      assembleChangeView({ plane: "combined", selected_id: "glt.controlplane.dashboard" }),
    );
    expect(html).toContain("runtime: unknown");
    expect(html).not.toContain("runtime: healthy");
    expect(html).toContain('data-runtime="unknown"');
    expect(html).not.toContain('data-runtime="healthy"');
    expect(html).toContain("нет наблюдения");
  });

  it("S-8 the visible list is clipped by the P03 card, not a dashboard literal", () => {
    const max = dashboardMaxTopLevel();
    const surface = assembleChangeView({ plane: "combined" });
    expect(surface.visible.length).toBeLessThanOrEqual(max);
    const html = renderChangeDashboard(surface);
    expect(html).toContain(`data-hidden="${String(surface.hidden)}"`);
    expect(html).not.toContain("max_top_level: 16");
  });

  it("blocks the glyph layer and keeps color from being the only channel", () => {
    const html = renderChangeDashboard(assembleChangeView({ plane: "combined" }));
    expect(html).toContain('data-glyph-layer="blocked"');
    expect(html).toContain("E04 не измерен");
    expect(html).not.toContain("data-layer=\"glyph\"");
    expect(html).toContain("plane drift");
    expect(html).toContain("expected");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Evidence"');
  });

  it("a passed or verified axis discloses its basis", () => {
    const surface = assembleChangeView({
      plane: "combined",
      selected_id: "glt.controlplane.domain",
    });
    const html = renderChangeDashboard(surface);
    expect(html).toContain("на основании:");
    expect(surface.selected?.id).toBe("glt.controlplane.domain");
  });
});
