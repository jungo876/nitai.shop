import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/** The Netlify scheduled function must call the cleanup endpoint with the cron secret. */
let server: Server;
let seen: { url?: string; auth?: string } = {};
let base = "";

beforeAll(async () => {
  server = createServer((req, res) => {
    seen = { url: req.url, auth: req.headers.authorization };
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"expired":0}');
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("netlify/functions/expire-orders", () => {
  it("runs hourly and calls /api/cron/expire-orders with the secret", async () => {
    const saved = { APP_URL: process.env.APP_URL, CRON_SECRET: process.env.CRON_SECRET };
    process.env.APP_URL = base + "/";
    process.env.CRON_SECRET = "test-cron-secret-123456";
    try {
      // Path in a variable: TypeScript cannot type-check `.mts` imports here; Vitest loads it fine.
      const file = "../netlify/functions/expire-orders.mts";
      const mod = (await import(/* @vite-ignore */ file)) as { default: () => Promise<Response>; config: { schedule: string } };
      expect(mod.config.schedule).toBe("@hourly");
      const res = await mod.default();
      expect(res.status).toBe(200);
      expect(seen).toEqual({ url: "/api/cron/expire-orders", auth: "Bearer test-cron-secret-123456" });
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});
