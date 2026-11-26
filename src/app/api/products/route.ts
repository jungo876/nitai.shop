import { z } from "zod";
import { clientIp, json, parseOrThrow, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { getCurrentUser, requireAdmin } from "@/server/auth/session";
import { listProducts } from "@/server/catalog";
import { createProduct } from "@/server/admin/products";
import { logAdminAction } from "@/server/audit";
import { productSchema } from "@/lib/validations/product";

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  company_id: z.uuid("Invalid company_id").optional(),
  category: z.string().trim().max(100).optional(),
  home_category: z.string().trim().max(100).optional(),
  top_selling: z.enum(["true", "false"]).optional(),
  include_hidden: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).max(100000).optional(),
});

/** GET /api/products?search=&company_id=&category=&home_category=&top_selling=true&limit=&offset= */
export const GET = route(async (req) => {
  await enforceRateLimit("read", clientIp(req));
  const q = parseOrThrow(querySchema, Object.fromEntries(req.nextUrl.searchParams));
  // Hidden products are only listed for admins.
  const includeHidden = q.include_hidden === "true" && (await getCurrentUser(req))?.is_admin === true;
  const products = await listProducts({
    search: q.search,
    companyId: q.company_id,
    category: q.category,
    homeCategory: q.home_category,
    topSelling: q.top_selling === "true",
    includeHidden,
    limit: q.limit ?? 50,
    offset: q.offset ?? 0,
  });
  return json(products);
});

/** POST /api/products (admin) */
export const POST = route(async (req) => {
  const admin = await requireAdmin(req);
  const input = await readJson(req, productSchema, 256 * 1024);
  const product = await createProduct(input);
  await logAdminAction(admin.id, "Product Created", "Product", product?.id, { name: input.name });
  return json(product, { status: 201 });
});
