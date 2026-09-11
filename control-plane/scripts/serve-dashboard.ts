/**
 * Serves the Change dashboard as static HTML. Query: ?plane=&node=
 * Does not write the workspace.
 */
import { createServer } from "node:http";
import { renderChangeDashboard } from "@glt/dashboard";
import { assembleChangeView } from "../tests/change-view.ts";
import type { ChangePlaneFilter } from "@glt/domain";

const port = Number(process.env["PORT"] ?? "4173");

function planeOf(raw: string | null): ChangePlaneFilter {
  if (raw === "intended" || raw === "materialized" || raw === "combined") return raw;
  return "combined";
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const node = url.searchParams.get("node");
  const html = renderChangeDashboard(
    assembleChangeView({
      plane: planeOf(url.searchParams.get("plane")),
      ...(node !== null && node.length > 0 ? { selected_id: node } : {}),
    }),
  );
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}).listen(port, "127.0.0.1", () => {
  process.stderr.write(`dashboard http://127.0.0.1:${String(port)}/\n`);
});
