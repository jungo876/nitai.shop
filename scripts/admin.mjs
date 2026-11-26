#!/usr/bin/env node
/**
 * Manage admin access (uses DATABASE_URL from .env.local / the environment).
 *
 *   npm run admin:list                     # admins, phone numbers masked
 *   npm run admin:grant  -- 9876543210     # make this mobile number an admin
 *   npm run admin:revoke -- 9876543210     # remove admin access
 *
 * The person then logs in on the website with that number (OTP) and opens /admin.
 * Granting creates the user if they have never logged in. Changing access logs
 * that user out everywhere, so the new role applies immediately.
 */
import nextEnv from "@next/env";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });
const [cmd, rawPhone] = process.argv.slice(2);
const mask = (p) => `${p.slice(0, 2)}******${p.slice(-2)}`;

function normalise(input) {
  const d = String(input ?? "").replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

if (!["list", "grant", "revoke"].includes(cmd)) {
  console.error("Usage: node scripts/admin.mjs list | grant <phone> | revoke <phone>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (.env.local).");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
try {
  if (cmd === "list") {
    const rows = await sql`select phone_number, name, created_at from users where is_admin order by created_at`;
    console.log(rows.length ? `${rows.length} admin(s):` : "No admins yet. Run: npm run admin:grant -- <your 10-digit mobile>");
    for (const r of rows) console.log(`  ${mask(r.phone_number)}  ${r.name ?? "(name not set)"}`);
  } else {
    const phone = normalise(rawPhone);
    if (!phone) throw new Error("Give a valid 10-digit Indian mobile number.");
    const grant = cmd === "grant";
    const [u] = grant
      ? await sql`insert into users (phone_number, is_admin) values (${phone}, true)
                  on conflict (phone_number) do update set is_admin = true returning id`
      : await sql`update users set is_admin = false where phone_number = ${phone} returning id`;
    if (!u) throw new Error("No user with that number.");
    await sql`delete from sessions where user_id = ${u.id}`;
    console.log(`${grant ? "Granted" : "Revoked"} admin access for ${mask(phone)}.${grant ? " Log in with this number on the website, then open /admin." : ""}`);
  }
} catch (err) {
  console.error("Error:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
