import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { body, cookieFrom, freshIp, makeReq } from "./http";

/** Points the console OTP provider at a temp "outbox" file the tests can read. */
export function setupOtpOutbox() {
  const dir = mkdtempSync(path.join(tmpdir(), "nck-otp-"));
  const file = path.join(dir, "outbox.jsonl");
  process.env.OTP_PROVIDER = "console";
  process.env.OTP_CONSOLE_OUTBOX = file;
  return {
    file,
    lastCode(phone: string): string | null {
      if (!existsSync(file)) return null;
      const lines = readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
      const mine = lines.filter((l) => l.phone === phone);
      return mine.length ? mine[mine.length - 1].code : null;
    },
  };
}

let phoneSeq = 0;
/** Unique valid Indian mobile numbers for tests. */
export function testPhone() {
  phoneSeq++;
  return `98${String(Date.now() % 1_000_000).padStart(6, "0")}${String(phoneSeq).padStart(2, "0")}`.slice(0, 10);
}

/** Full OTP login; returns the session cookie string and user. */
export async function login(outbox: ReturnType<typeof setupOtpOutbox>, phone = testPhone()) {
  const reqRoute = await import("@/app/api/auth/otp/request/route");
  const verifyRoute = await import("@/app/api/auth/otp/verify/route");
  const ip = freshIp();
  const r1 = await reqRoute.POST(makeReq("POST", "/api/auth/otp/request", { body: { phone_number: phone }, ip }), undefined);
  if (r1.status !== 200) throw new Error(`otp request failed: ${r1.status} ${JSON.stringify(await r1.json())}`);
  const code = outbox.lastCode(phone)!;
  const r2 = await verifyRoute.POST(makeReq("POST", "/api/auth/otp/verify", { body: { phone_number: phone, code }, ip }), undefined);
  if (r2.status >= 300) throw new Error(`otp verify failed: ${r2.status} ${JSON.stringify(await r2.json())}`);
  const cookie = cookieFrom(r2, "nck_sid")!;
  const data = await body<{ user: { id: string } }>(r2);
  return { cookie, user: data.user, phone };
}
