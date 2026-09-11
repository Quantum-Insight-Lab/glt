import { renderToStaticMarkup } from "react-dom/server";
import { ChangeDashboard } from "./ChangeDashboard.ts";
import type { ChangeView } from "./model.ts";

export function renderChangeDashboard(model: ChangeView): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>GLT Change</title></head><body>${renderToStaticMarkup(ChangeDashboard(model))}</body></html>`;
}
