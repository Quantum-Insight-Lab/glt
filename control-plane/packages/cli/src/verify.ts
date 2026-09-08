import { PACK, loadSeedPublicKeys, loadYaml } from "@glt/contracts";
import {
  ExitCode,
  verifyBootstrapManifest,
  type BootstrapVerifyOk,
  type SeedKey,
} from "@glt/domain";
import type { Writer } from "./output.ts";

/**
 * `glt verify` — INV-10 as a command.
 *
 * Keys are read first. The manifest is parsed second. The pure verifier never
 * sees a filesystem, and never receives a key that came out of the manifest.
 */

interface VerifyIo {
  loadSeedKeys: () => readonly SeedKey[];
  loadManifest: () => unknown;
}

interface VerifyReport extends BootstrapVerifyOk {
  readonly ok: true;
  readonly order: readonly string[];
}

const defaultVerifyIo: VerifyIo = {
  loadSeedKeys: () => loadSeedPublicKeys(),
  loadManifest: () => loadYaml(PACK.bootstrapManifest),
};

export function verifyBootstrap(io: VerifyIo = defaultVerifyIo): VerifyReport {
  const order: string[] = [];
  order.push("load-t0");
  const keys = io.loadSeedKeys();
  order.push("parse-manifest");
  const manifest = io.loadManifest();
  const result = verifyBootstrapManifest(keys, manifest);
  order.push("verify-signature");
  return { ok: true, order, ...result };
}

export function runVerify(writer: Writer): number {
  try {
    const report = verifyBootstrap();
    writer.artifact(report, renderVerifyReport);
    return ExitCode.Success;
  } catch (error) {
    return writer.fail(error);
  }
}

function renderVerifyReport(report: VerifyReport): string {
  return [
    "bootstrap verify: ok",
    `  order: ${report.order.join(" → ")}`,
    `  key_id: ${report.keyId}`,
    `  payload_digest: ${report.payloadDigest}`,
  ].join("\n");
}
