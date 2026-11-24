import { timingSafeEqual } from "node:crypto";
import { json, route, unauthorized } from "@/server/http";
import { requireEnv } from "@/server/env";
import { expirePendingOrders } from "@/server/orders";
import { log } from "@/server/logger";

/**
 * GET /api/cron/expire-orders — cancels checkout attempts that were never paid.
 * Called by Vercel Cron (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 */
export const GET = route(async (req) => {
  const expected = Buffer.from(`Bearer ${requireEnv("CRON_SECRET")}`);
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw unauthorized("Invalid cron secret.");
  const expired = await expirePendingOrders();
  log.info("cron_expire_orders", { expired });
  return json({ expired });
});
