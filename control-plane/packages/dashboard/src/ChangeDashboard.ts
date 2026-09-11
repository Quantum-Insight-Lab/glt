/**
 * B1 Change dashboard (DEV-20). Read-only projection. No status edit, no
 * glyph layer, no compiler or store access (S-2, S-5).
 *
 * Contract: glt-specpack/docs/SPEC/dashboard.md
 */

import { createElement as h, type ReactElement } from "react";
import type { AxisView, ChangeView, NodeView, PlaneFilter } from "./model.ts";

export const DASHBOARD_STEP = "glt.dev.20" as const;

const PLANES: readonly { readonly id: PlaneFilter; readonly label: string }[] = [
  { id: "intended", label: "Intended" },
  { id: "materialized", label: "Build" },
  { id: "combined", label: "Combined" },
];

export function ChangeDashboard(model: ChangeView): ReactElement {
  return h(
    "main",
    {
      role: "main",
      "aria-label": "Change dashboard",
      "data-mode": model.mode,
      "data-glyph-layer": model.glyph_layer,
      "data-write": "forbidden",
    },
    header(model),
    planeToggle(model.plane),
    topology(model),
    evidence(model.selected),
    h(
      "p",
      { "data-glyph-notice": "blocked" },
      "Слой глифов заблокирован: E04 не измерен.",
    ),
  );
}

function header(model: ChangeView): ReactElement {
  return h(
    "header",
    { "aria-label": "Snapshot" },
    meta("project", "GLT Control Plane"),
    meta("env", "local"),
    meta("git", model.git_sha ?? "unpinned"),
    meta("freshness", model.freshness),
    meta("conflicts", String(model.conflict_count)),
    h("p", { "data-field": "snapshot" }, `${model.snapshot_id} ${model.snapshot_digest}`),
    h(
      "p",
      { "data-field": "write", "data-blocked": String(model.write_blocked) },
      model.write_blocked ? "write blocked" : "write permitted for read-only view",
    ),
  );
}

function meta(name: string, value: string): ReactElement {
  return h("p", { "data-field": name }, `${name}: ${value}`);
}

function planeToggle(current: PlaneFilter): ReactElement {
  return h(
    "nav",
    { role: "radiogroup", "aria-label": "Plane" },
    ...PLANES.map((plane) =>
      h(
        "a",
        {
          role: "radio",
          "aria-checked": plane.id === current ? "true" : "false",
          href: `/?plane=${plane.id}`,
          "data-plane": plane.id,
        },
        plane.label,
      ),
    ),
  );
}

function topology(model: ChangeView): ReactElement {
  return h(
    "section",
    { "aria-label": "Topology", "data-hidden": String(model.hidden) },
    h(
      "ol",
      { "aria-label": "Nodes" },
      ...model.visible.map((node) =>
        h(
          "li",
          {
            key: node.id,
            "data-id": node.id,
            "data-class": node.class,
            "data-presence": node.presence,
            "data-runtime": node.runtime,
          },
          h(
            "a",
            {
              href: query(model.plane, node.id),
              ...(node.id === model.selected_id ? { "aria-current": "true" } : {}),
            },
            node.id,
          ),
          " ",
          h("span", { "data-class-label": node.class }, classLabel(node.class)),
          " ",
          h("span", { "data-runtime-label": node.runtime }, `runtime: ${node.runtime}`),
        ),
      ),
    ),
    model.hidden > 0
      ? h("p", { "data-clipped": "true" }, `hidden ${String(model.hidden)} by P03`)
      : null,
  );
}

function evidence(node: NodeView | undefined): ReactElement {
  if (node === undefined) {
    return h("aside", { role: "region", "aria-label": "Evidence" }, "узел не выбран");
  }
  return h(
    "aside",
    { role: "region", "aria-label": "Evidence", "data-selected": node.id },
    h("h2", null, node.id),
    h("p", null, `class: ${classLabel(node.class)}`),
    h(
      "ul",
      { "aria-label": "Axes" },
      ...node.axes.map((axis) =>
        h(
          "li",
          { "data-axis": axis.name, "data-value": axis.value, "data-provenance": axis.provenance },
          `${axis.name}: ${axis.value}`,
          " ",
          basis(axis),
        ),
      ),
    ),
  );
}

function basis(axis: AxisView): ReactElement {
  const unknown = axis.value === "unknown";
  return h(
    "span",
    { "data-basis": unknown ? "absent" : "present" },
    unknown ? "нет наблюдения" : `на основании: ${axis.provenance}`,
  );
}

function classLabel(klass: NodeView["class"]): string {
  if (klass === "plane_drift") return "plane drift";
  if (klass === "expected") return "expected";
  return "aligned";
}

function query(plane: PlaneFilter, node: string): string {
  return `/?plane=${plane}&node=${encodeURIComponent(node)}`;
}
