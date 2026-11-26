import { badRequest, json, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/rate-limit";
import { MAX_UPLOAD_BYTES, uploadImage } from "@/server/storage";
import { logAdminAction } from "@/server/audit";

/** POST /api/upload (multipart: file, folder=products|brands|banners) -> { url } — admin only */
export const POST = route(async (req) => {
  const admin = await requireAdmin(req);
  await enforceRateLimit("write", admin.id);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    throw badRequest("Image is too large (maximum 5 MB).");
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("No file provided.");
  const folderRaw = String(form.get("folder") ?? "products");
  const folder = (["products", "brands", "banners"] as const).find((f) => f === folderRaw) ?? "products";
  const url = await uploadImage(file, folder);
  await logAdminAction(admin.id, "Image Uploaded", "Storage", null, { folder, size: file.size });
  return json({ url }, { status: 201 });
});
