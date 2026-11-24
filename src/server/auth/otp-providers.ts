import "server-only";
import { appendFileSync } from "node:fs";
import { env, requireEnv } from "../env";
import { log, maskPhone } from "../logger";

/**
 * How one-time login codes reach the customer.
 *
 * Two styles:
 *  - "local" providers deliver a code WE generate (we store its HMAC and check it).
 *  - "managed" providers generate and check the code themselves (Twilio Verify).
 *
 * Choose with OTP_PROVIDER. `console` is for development/tests only and is
 * refused in production by productionConfigProblems().
 */

export type OtpProvider =
  | { kind: "local"; name: string; deliver(phone10: string, code: string): Promise<void> }
  | { kind: "managed"; name: string; start(phone10: string): Promise<string | null>; check(phone10: string, code: string): Promise<boolean> };

class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpProviderError";
  }
}
export { ProviderError as OtpProviderError };

const consoleProvider: OtpProvider = {
  kind: "local",
  name: "console",
  async deliver(phone10, code) {
    // Development only: the code is printed to the server terminal.
    console.log(`\n[DEV OTP] Login code for +91 ${phone10}: ${code}\n`);
    const outbox = env().OTP_CONSOLE_OUTBOX;
    if (outbox) appendFileSync(outbox, JSON.stringify({ phone: phone10, code, at: new Date().toISOString() }) + "\n");
  },
};

/** MSG91 OTP API (India). Sends our code using an approved DLT template. */
const msg91Provider: OtpProvider = {
  kind: "local",
  name: "msg91",
  async deliver(phone10, code) {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", requireEnv("MSG91_TEMPLATE_ID"));
    url.searchParams.set("mobile", `91${phone10}`);
    url.searchParams.set("otp", code);
    const res = await fetch(url, { method: "POST", headers: { authkey: requireEnv("MSG91_AUTH_KEY"), "Content-Type": "application/json" }, body: "{}" });
    const body = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
    if (!res.ok || body.type === "error") {
      log.error("otp_send_failed", { provider: "msg91", status: res.status, message: body.message, phone: maskPhone(phone10) });
      throw new ProviderError("Could not send the code by SMS.");
    }
  },
};

/** Twilio Verify. Twilio generates, sends and checks the code. */
function twilioAuthHeader() {
  return "Basic " + Buffer.from(`${requireEnv("TWILIO_ACCOUNT_SID")}:${requireEnv("TWILIO_AUTH_TOKEN")}`).toString("base64");
}
const twilioProvider: OtpProvider = {
  kind: "managed",
  name: "twilio",
  async start(phone10) {
    const sid = requireEnv("TWILIO_VERIFY_SERVICE_SID");
    const res = await fetch(`https://verify.twilio.com/v2/Services/${sid}/Verifications`, {
      method: "POST",
      headers: { Authorization: twilioAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: `+91${phone10}`, Channel: "sms" }),
    });
    const body = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) {
      log.error("otp_send_failed", { provider: "twilio", status: res.status, message: body.message, phone: maskPhone(phone10) });
      throw new ProviderError("Could not send the code by SMS.");
    }
    return body.sid ?? null;
  },
  async check(phone10, code) {
    const sid = requireEnv("TWILIO_VERIFY_SERVICE_SID");
    const res = await fetch(`https://verify.twilio.com/v2/Services/${sid}/VerificationCheck`, {
      method: "POST",
      headers: { Authorization: twilioAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: `+91${phone10}`, Code: code }),
    });
    if (res.status === 404) return false; // expired / already approved
    const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
    if (!res.ok) {
      log.error("otp_check_failed", { provider: "twilio", status: res.status, message: body.message });
      throw new ProviderError("Could not verify the code. Please try again.");
    }
    return body.status === "approved";
  },
};

export function getOtpProvider(): OtpProvider {
  switch (env().OTP_PROVIDER) {
    case "msg91":
      return msg91Provider;
    case "twilio":
      return twilioProvider;
    default:
      return consoleProvider;
  }
}
