/**
 * Netlify Scheduled Function (replaces the Vercel cron in vercel.json).
 * Every hour it calls the site's cleanup endpoint, which cancels checkouts that
 * were never paid and deletes expired sessions / old login codes.
 * Needs APP_URL and CRON_SECRET in Netlify → Site configuration → Environment variables.
 */
export default async function handler(): Promise<Response> {
  const base = (process.env.APP_URL || process.env.URL || "").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("expire-orders: APP_URL (or URL) and CRON_SECRET must be set");
    return new Response("not configured", { status: 500 });
  }
  const res = await fetch(`${base}/api/cron/expire-orders`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.text();
  console.log(`expire-orders: HTTP ${res.status} ${body.slice(0, 200)}`);
  return new Response(null, { status: res.ok ? 200 : 502 });
}

export const config = { schedule: "@hourly" };
