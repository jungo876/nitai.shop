import { z } from "zod";
import { json, parseOrThrow, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { listCustomers } from "@/server/admin/customers";

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

/** GET /api/admin/customers?search=&limit=&offset= */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const q = parseOrThrow(querySchema, Object.fromEntries(req.nextUrl.searchParams));
  return json(await listCustomers(q));
});
