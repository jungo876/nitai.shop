import { assertUuid, json, notFound, readJson, route } from "@/server/http";
import { getCurrentUser, requireAdmin } from "@/server/auth/session";
import { getProduct } from "@/server/catalog";
import { deleteProduct, updateProduct } from "@/server/admin/products";
import { logAdminAction } from "@/server/audit";
import { productSchema } from "@/lib/validations/product";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/products/:id (hidden products only for admins) */
export const GET = route<Ctx>(async (req, { params }) => {
  const id = assertUuid((await params).id, "product id");
  const isAdmin = (await getCurrentUser(req))?.is_admin === true;
  const product = await getProduct(id, { includeHidden: isAdmin });
  if (!product) throw notFound("Product not found.");
  return json(product);
});

/** PUT /api/products/:id (admin) */
export const PUT = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = assertUuid((await params).id, "product id");
  const input = await readJson(req, productSchema, 256 * 1024);
  const product = await updateProduct(id, input);
  await logAdminAction(admin.id, "Product Updated", "Product", id, { name: input.name });
  return json(product);
});

/** DELETE /api/products/:id (admin) */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = assertUuid((await params).id, "product id");
  await deleteProduct(id);
  await logAdminAction(admin.id, "Product Deleted", "Product", id);
  return json({ success: true });
});
