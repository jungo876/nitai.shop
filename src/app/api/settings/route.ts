import { json, route } from "@/server/http";
import { getStoreSettings, publicSettings } from "@/server/settings";

/** GET /api/settings -> public store settings (contact numbers, open/closed, COD rules) */
export const GET = route(async () => json(publicSettings(await getStoreSettings())));
