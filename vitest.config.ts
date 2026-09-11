import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const pkg = (name: string) =>
  fileURLToPath(new URL(`./control-plane/packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@glt/contracts": pkg("contracts"),
      "@glt/domain": pkg("domain"),
      "@glt/registry": pkg("registry"),
      "@glt/snapshot": pkg("snapshot"),
      "@glt/collectors": pkg("collectors"),
      "@glt/impact": pkg("impact"),
      "@glt/dashboard": pkg("dashboard"),
      "@glt/api": pkg("api"),
      "@glt/cli": pkg("cli"),
    },
  },
  test: {
    include: ["control-plane/**/*.test.ts"],
    environment: "node",
    // Structural tests shell out to dependency-cruiser and madge.
    testTimeout: 120_000,
  },
});
