/**
 * Serves the read-only HTTP API on 127.0.0.1. Does not write the workspace.
 */
import { buildApi } from "./server.ts";

const port = Number(process.env["PORT"] ?? "4174");
const app = buildApi();
await app.listen({ host: "127.0.0.1", port });
process.stderr.write(`api http://127.0.0.1:${String(port)}/\n`);
