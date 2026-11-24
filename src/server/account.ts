import "server-only";
import { db } from "./db";
import type { SessionUser } from "./auth/session";
import type { SetupInput } from "@/lib/validations/account";

export interface Profile extends SessionUser {
  business_profile: {
    shop_name: string | null;
    gst_number: string | null;
    pan_number: string | null;
    business_type: string | null;
  } | null;
  address: {
    address_line: string | null;
    landmark: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    phone_number: string | null;
  } | null;
}

export async function getProfile(user: SessionUser): Promise<Profile> {
  const sql = db();
  const [bp] = await sql`select shop_name, gst_number, pan_number, business_type from business_profiles where user_id = ${user.id}`;
  const [addr] = await sql`select address_line, landmark, city, state, pincode, phone_number from addresses where user_id = ${user.id}`;
  return {
    ...user,
    business_profile: bp ? { shop_name: bp.shop_name, gst_number: bp.gst_number, pan_number: bp.pan_number, business_type: bp.business_type } : null,
    address: addr
      ? { address_line: addr.address_line, landmark: addr.landmark, city: addr.city, state: addr.state, pincode: addr.pincode, phone_number: addr.phone_number }
      : null,
  };
}

/** Saves name, business details and the delivery address in one transaction. */
export async function saveProfile(userId: string, input: SetupInput) {
  await db().begin(async (tx) => {
    await tx`
      update users set name = ${input.name}, whatsapp_number = ${input.whatsapp_number}, is_profile_complete = true
      where id = ${userId}`;
    await tx`
      insert into business_profiles (user_id, shop_name, gst_number, pan_number, business_type)
      values (${userId}, ${input.shop_name}, ${input.gst_number}, ${input.pan_number}, ${input.business_type})
      on conflict (user_id) do update set
        shop_name = excluded.shop_name, gst_number = excluded.gst_number,
        pan_number = excluded.pan_number, business_type = excluded.business_type`;
    await tx`
      insert into addresses (user_id, address_line, landmark, city, state, pincode, is_default)
      values (${userId}, ${input.address_line}, ${input.landmark}, ${input.city}, ${input.state}, ${input.pincode}, true)
      on conflict (user_id) do update set
        address_line = excluded.address_line, landmark = excluded.landmark, city = excluded.city,
        state = excluded.state, pincode = excluded.pincode, is_default = true`;
  });
}
