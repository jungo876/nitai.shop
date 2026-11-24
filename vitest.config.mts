import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      // `server-only` throws outside the React Server Components bundler; it's a no-op in tests.
      "server-only": r("./tests/helpers/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Each DB test file starts its own in-memory Postgres; keep the number of
    // simultaneous instances modest on small machines.
    maxWorkers: 4,
    env: { NODE_ENV: "test", APP_ENV: "test", LOG_LEVEL: "error" },
  },
});
