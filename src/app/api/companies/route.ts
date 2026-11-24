import { json, readJson, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { listCompanies } from "@/server/catalog";
import { createCompany } from "@/server/admin/products";
import { logAdminAction } from "@/server/audit";
import { companySchema } from "@/lib/validations/product";

/** GET /api/companies -> all brands (with visible product counts) */
export const GET = route(async () => json(await listCompanies()));

/** POST /api/companies (admin) */
export const POST = route(async (req) => {
  const admin = await requireAdmin(req);
  const input = await readJson(req, companySchema);
  const company = await createCompany(input);
  await logAdminAction(admin.id, "Company Created", "Company", company.id, { name: company.name });
  return json(company, { status: 201 });
});
