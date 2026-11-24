import { assertUuid, json, notFound, readJson, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { getCompany } from "@/server/catalog";
import { deleteCompany, updateCompany } from "@/server/admin/products";
import { logAdminAction } from "@/server/audit";
import { companySchema } from "@/lib/validations/product";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const company = await getCompany(assertUuid((await params).id, "brand id"));
  if (!company) throw notFound("Brand not found.");
  return json(company);
});

export const PUT = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = assertUuid((await params).id, "brand id");
  const company = await updateCompany(id, await readJson(req, companySchema));
  await logAdminAction(admin.id, "Company Updated", "Company", id, { name: company.name });
  return json(company);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = assertUuid((await params).id, "brand id");
  await deleteCompany(id);
  await logAdminAction(admin.id, "Company Deleted", "Company", id);
  return json({ success: true });
});
