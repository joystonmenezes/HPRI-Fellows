import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveContent, type SiteContent } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const patch = (await req.json()) as Partial<SiteContent>;
    const saved = await saveContent(patch);
    return NextResponse.json({ ok: true, content: saved });
  } catch (e) {
    console.error("[admin/content] error", e);
    return NextResponse.json(
      { ok: false, error: "Could not save changes." },
      { status: 500 },
    );
  }
}
