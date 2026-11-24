import { assertUuid, json, notFound, route } from "@/server/http";
import { recommendedProducts } from "@/server/catalog";

/** GET /api/products/recommended?productId= */
export const GET = route(async (req) => {
  const id = assertUuid(req.nextUrl.searchParams.get("productId"), "productId");
  const products = await recommendedProducts(id);
  if (!products) throw notFound("Product not found.");
  return json(products);
});
