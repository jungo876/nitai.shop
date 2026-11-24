import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startMigratedDb } from "./helpers/migrated-db";
import { body, cookieFrom, freshIp, makeReq } from "./helpers/http";
import { login, setupOtpOutbox, testPhone } from "./helpers/auth";

let ctx: Awaited<ReturnType<typeof startMigratedDb>>;
let outbox: ReturnType<typeof setupOtpOutbox>;
let otpRequest: typeof import("@/app/api/auth/otp/request/route");
let otpVerify: typeof import("@/app/api/auth/otp/verify/route");
let me: typeof import("@/app/api/auth/me/route");
let logout: typeof import("@/app/api/auth/logout/route");
let setup: typeof import("@/app/api/auth/setup/route");

beforeAll(async () => {
  outbox = setupOtpOutbox();
  ctx = await startMigratedDb();
  otpRequest = await import("@/app/api/auth/otp/request/route");
  otpVerify = await import("@/app/api/auth/otp/verify/route");
  me = await import("@/app/api/auth/me/route");
  logout = await import("@/app/api/auth/logout/route");
  setup = await import("@/app/api/auth/setup/route");
});
afterAll(async () => ctx?.cleanup());

const send = (phone: string, ip = freshIp()) =>
  otpRequest.POST(makeReq("POST", "/api/auth/otp/request", { body: { phone_number: phone }, ip }), undefined);
const verify = (phone: string, code: string, ip = freshIp()) =>
  otpVerify.POST(makeReq("POST", "/api/auth/otp/verify", { body: { phone_number: phone, code }, ip }), undefined);

describe("OTP login", () => {
  it("rejects invalid phone numbers", async () => {
    for (const p of ["12345", "1234567890", "abcdefghij", ""]) {
      expect((await send(p)).status).toBe(400);
    }
  });

  it("accepts +91 / spaces and normalises to 10 digits", async () => {
    const phone = testPhone();
    const res = await send(`+91 ${phone.slice(0, 5)} ${phone.slice(5)}`);
    expect(res.status).toBe(200);
    expect(outbox.lastCode(phone)).toMatch(/^\d{6}$/);
  });

  it("does not store the code in plain text", async () => {
    const phone = testPhone();
    await send(phone);
    const code = outbox.lastCode(phone)!;
    const rows = await ctx.sql`select code_hash from otp_challenges where phone_number = ${phone}`;
    expect(rows[0].code_hash).not.toContain(code);
    expect(rows[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("enforces a resend cooldown per phone", async () => {
    const phone = testPhone();
    expect((await send(phone)).status).toBe(200);
    const second = await send(phone);
    expect(second.status).toBe(429);
    expect(second.headers.get("retry-after")).toBeTruthy();
  });

  it("logs in with the right code, creates the user and sets a secure session cookie", async () => {
    const phone = testPhone();
    await send(phone);
    const res = await verify(phone, outbox.lastCode(phone)!);
    expect(res.status).toBe(201);
    const data = await body<{ user: { phone_number: string; is_admin: boolean; is_profile_complete: boolean } }>(res);
    expect(data.user).toMatchObject({ phone_number: phone, is_admin: false, is_profile_complete: false });
    const setCookie = res.headers.getSetCookie().find((c) => c.startsWith("nck_sid="))!;
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    // only the hash of the token is stored
    const token = setCookie.split(";")[0].split("=")[1];
    const sessions = await ctx.sql`select token_hash from sessions`;
    expect(sessions.some((s) => s.token_hash === token)).toBe(false);
  });

  it("rejects a wrong code, counts attempts, then locks the code", async () => {
    const phone = testPhone();
    await send(phone);
    const right = outbox.lastCode(phone)!;
    const wrong = right === "000000" ? "111111" : "000000";
    const first = await verify(phone, wrong);
    expect(first.status).toBe(400);
    expect((await body(first)).error).toMatch(/4 attempts left/);
    for (let i = 0; i < 4; i++) await verify(phone, wrong);
    // even the right code no longer works after 5 wrong attempts
    expect((await verify(phone, right)).status).toBe(429);
  });

  it("rejects an expired code", async () => {
    const phone = testPhone();
    await send(phone);
    await ctx.sql`update otp_challenges set expires_at = now() - interval '1 minute' where phone_number = ${phone}`;
    const res = await verify(phone, outbox.lastCode(phone)!);
    expect(res.status).toBe(400);
    expect((await body(res)).error).toMatch(/expired/);
  });

  it("a code can only be used once", async () => {
    const phone = testPhone();
    await send(phone);
    const code = outbox.lastCode(phone)!;
    expect((await verify(phone, code)).status).toBeLessThan(300);
    expect((await verify(phone, code)).status).toBe(400);
  });

  it("blocks cross-site login requests", async () => {
    const res = await otpRequest.POST(
      makeReq("POST", "/api/auth/otp/request", { body: { phone_number: testPhone() }, origin: "https://evil.example", ip: freshIp() }),
      undefined
    );
    expect(res.status).toBe(403);
  });
});

describe("session, profile and logout", () => {
  it("/me returns null without a session and ignores forged cookies", async () => {
    expect(await body(await me.GET(makeReq("GET", "/api/auth/me"), undefined))).toEqual({ user: null });
    // the old insecure cookie held a phone number — it must not log anyone in
    const forged = await me.GET(makeReq("GET", "/api/auth/me", { cookie: "nck_session=9876543210; nck_sid=" + "x".repeat(43) }), undefined);
    expect(await body(forged)).toEqual({ user: null });
  });

  it("profile setup requires login and only ever updates the logged-in user", async () => {
    const victim = await login(outbox);
    const attacker = await login(outbox);
    const payload = {
      user_id: victim.user.id, // must be ignored
      name: "Ramesh Traders", shop_name: "Ramesh Agro Store", business_type: "retailer",
      gst_number: "19abcde1234f1z5", address_line: "12 Station Road, Uluberia", city: "Howrah",
      state: "West Bengal", pincode: "711316",
    };
    expect((await setup.POST(makeReq("POST", "/api/auth/setup", { body: payload }), undefined)).status).toBe(401);

    const res = await setup.POST(makeReq("POST", "/api/auth/setup", { body: payload, cookie: attacker.cookie }), undefined);
    expect(res.status).toBe(200);
    const [v] = await ctx.sql`select name, is_profile_complete from users where id = ${victim.user.id}`;
    expect(v).toMatchObject({ name: null, is_profile_complete: false });
    const [a] = await ctx.sql`select u.name, b.gst_number from users u join business_profiles b on b.user_id = u.id where u.id = ${attacker.user.id}`;
    expect(a).toMatchObject({ name: "Ramesh Traders", gst_number: "19ABCDE1234F1Z5" });
  });

  it("validates profile fields", async () => {
    const u = await login(outbox);
    const res = await setup.POST(
      makeReq("POST", "/api/auth/setup", { body: { name: "A", shop_name: "", address_line: "x", city: "", state: "", pincode: "123" }, cookie: u.cookie }),
      undefined
    );
    expect(res.status).toBe(400);
    const data = await body<{ details: { field: string }[] }>(res);
    expect(data.details.map((d) => d.field)).toEqual(expect.arrayContaining(["name", "shop_name", "pincode"]));
  });

  it("logout ends the session server-side", async () => {
    const u = await login(outbox);
    const before = await body<{ user: { id: string } | null }>(await me.GET(makeReq("GET", "/api/auth/me", { cookie: u.cookie }), undefined));
    expect(before.user?.id).toBe(u.user.id);
    const out = await logout.POST(makeReq("POST", "/api/auth/logout", { cookie: u.cookie }), undefined);
    expect(cookieFrom(out, "nck_sid")).toBeNull(); // cleared
    const after = await body(await me.GET(makeReq("GET", "/api/auth/me", { cookie: u.cookie }), undefined));
    expect(after).toEqual({ user: null }); // old cookie is useless now
  });
});
