/**
 * Serves the read-only HTTP API. Default bind is 127.0.0.1.
 * Compose sets HOST=0.0.0.0 and publishes 127.0.0.1 on the host.
 */
import { apiBind, buildApi } from "./server.ts";

const { host, port } = apiBind();
const app = buildApi();
await app.listen({ host, port });
process.stderr.write(`api http://${host}:${String(port)}/\n`);
