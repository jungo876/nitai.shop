import { json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { checkoutSummary } from "@/server/orders";

/** Server-calculated checkout summary (items, prices, address, store rules). */
const handler = route(async (req) => json(await checkoutSummary(await requireUser(req))));

export const GET = handler;
// POST kept for compatibility with older clients; it changes nothing.
export const POST = route(async (req) => json(await checkoutSummary(await requireUser(req))));
