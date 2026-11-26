import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "../db";
import { env } from "../env";
import { randomToken, sha256Hex } from "../crypto";
import { forbidden, unauthorized } from "../http";

/**
 * Database-backed sessions.
 * The browser holds a random 256-bit token in an httpOnly cookie; the database
 * stores only its SHA-256 hash, so a database leak does not leak sessions.
 * Sessions last 30 days and slide forward while in use.
 */

export const SESSION_COOKIE = "nck_sid";
const LEGACY_COOKIE = "nck_session"; // old insecure cookie (held the raw phone number)
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  phone_number: string;
  name: string | null;
  whatsapp_number: string | null;
  email: string | null;
  is_profile_complete: boolean;
  is_admin: boolean;
  created_at: string;
}

function cookieOptions(maxAgeSeconds: number) {
  const e = env();
  const secure = e.isProduction || (e.APP_URL?.startsWith("https://") ?? false);
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: maxAgeSeconds };
}

export async function createSession(res: NextResponse, userId: string, meta: { ip: string; userAgent: string | null }) {
  const token = randomToken(32);
  await db()`
    insert into sessions (user_id, token_hash, expires_at, ip, user_agent)
    values (${userId}, ${sha256Hex(token)}, now() + make_interval(days => ${SESSION_DAYS}), ${meta.ip}, ${meta.userAgent?.slice(0, 300) ?? null})`;
  res.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 24 * 3600));
  res.cookies.set(LEGACY_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

export async function destroySession(req: NextRequest, res: NextResponse) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await db()`delete from sessions where token_hash = ${sha256Hex(token)}`;
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  res.cookies.set(LEGACY_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

/** Removes every session of a user (e.g. after an admin role change). */
export async function destroyAllSessions(userId: string) {
  await db()`delete from sessions where user_id = ${userId}`;
}

/** The logged-in user, or null. Never throws for a missing/invalid cookie. */
export async function getCurrentUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 32 || token.length > 100) return null;
  const sql = db();
  const [row] = await sql`
    select s.id as session_id, s.last_seen_at < now() - interval '1 day' as stale,
           u.id, u.phone_number, u.name, u.whatsapp_number, u.email,
           u.is_profile_complete, u.is_admin, u.created_at
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${sha256Hex(token)} and s.expires_at > now()`;
  if (!row) return null;
  if (row.stale) {
    // Sliding expiry, written at most once a day per session.
    await sql`update sessions set last_seen_at = now(), expires_at = now() + make_interval(days => ${SESSION_DAYS}) where id = ${row.session_id}`;
  }
  return {
    id: row.id,
    phone_number: row.phone_number,
    name: row.name,
    whatsapp_number: row.whatsapp_number,
    email: row.email,
    is_profile_complete: row.is_profile_complete,
    is_admin: row.is_admin,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function getUserById(id: string): Promise<SessionUser | null> {
  const [u] = await db()`
    select id, phone_number, name, whatsapp_number, email, is_profile_complete, is_admin, created_at
    from users where id = ${id}`;
  if (!u) return null;
  return {
    id: u.id, phone_number: u.phone_number, name: u.name, whatsapp_number: u.whatsapp_number, email: u.email,
    is_profile_complete: u.is_profile_complete, is_admin: u.is_admin,
    created_at: u.created_at instanceof Date ? u.created_at.toISOString() : String(u.created_at),
  };
}

export async function requireUser(req: NextRequest): Promise<SessionUser> {
  const user = await getCurrentUser(req);
  if (!user) throw unauthorized();
  return user;
}

export async function requireAdmin(req: NextRequest): Promise<SessionUser> {
  const user = await getCurrentUser(req);
  if (!user) throw unauthorized();
  if (!user.is_admin) throw forbidden();
  return user;
}

/**
 * Housekeeping (run by the cron job): removes expired sessions and login codes
 * older than a day. Codes from the last hour are kept because rate limits count them.
 */
export async function purgeExpiredAuthData() {
  const sql = db();
  const sessions = await sql`delete from sessions where expires_at < now()`;
  const codes = await sql`delete from otp_challenges where created_at < now() - interval '1 day'`;
  return { sessions: sessions.count, codes: codes.count };
}
