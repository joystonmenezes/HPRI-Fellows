import crypto from "node:crypto";
import { cookies } from "next/headers";

// Lightweight signed-cookie session for the admin dashboard. No external auth
// service or database — credentials live in environment variables and the
// session is an HMAC-signed token, so nothing sensitive is stored client-side.

export const SESSION_COOKIE = "fellows_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function secret(): string {
  // SESSION_SECRET signs the cookie. Fall back to ADMIN_PASSWORD so the site
  // still works if only that is set, but the deploy docs ask for a real secret.
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string): string {
  return b64url(
    crypto.createHmac("sha256", secret()).update(payload).digest(),
  );
}

// Length-safe constant-time string comparison (hash first so differing
// lengths don't throw and don't leak via timing).
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function adminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && secret(),
  );
}

export function credentialsValid(username: string, password: string): boolean {
  if (!adminConfigured()) return false;
  const okUser = safeEqual(username, process.env.ADMIN_USERNAME || "");
  const okPass = safeEqual(password, process.env.ADMIN_PASSWORD || "");
  return okUser && okPass;
}

export function createSessionToken(username: string): string {
  const payload = b64url(
    Buffer.from(
      JSON.stringify({ u: username, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
    ),
  );
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string): { username: string } | null {
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(payload))) return null;
  try {
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    );
    if (typeof json.exp !== "number" || Date.now() > json.exp) return null;
    return { username: String(json.u || "") };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

// Read-side helper usable from server components and route handlers.
export function getSession(): { username: string } | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
