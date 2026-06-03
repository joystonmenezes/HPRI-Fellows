import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  adminConfigured,
  credentialsValid,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!adminConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Admin login is not configured yet. Set ADMIN_USERNAME, ADMIN_PASSWORD and SESSION_SECRET in .env.local.",
        },
        { status: 503 },
      );
    }

    const form = await req.formData();
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");

    if (!credentialsValid(username, password)) {
      return NextResponse.json(
        { ok: false, error: "Incorrect username or password." },
        { status: 401 },
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, createSessionToken(username), sessionCookieOptions);
    return res;
  } catch (e) {
    console.error("[admin/login] error", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
