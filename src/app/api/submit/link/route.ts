import { NextResponse } from "next/server";
import { isEmail, isHttpUrl, assignmentOpen, recordAndNotify } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Alternative to uploading a file: record a shareable link (e.g. a Google Drive
// video) for fellows whose file is over the 500 MB limit. Unlike the file flow,
// this uses no signed URL or expiring token, so a fellow can take their time
// creating the Drive link and come back to paste it without anything timing out.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    // Honeypot: a filled "company" field means a bot. Pretend success.
    if (String(body?.company || "").trim()) {
      return NextResponse.json({ ok: true });
    }

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const assignment = String(body?.assignment || "").trim();
    const note = String(body?.note || "").trim();
    const link = String(body?.link || "").trim();

    if (!name || !email || !assignment || !link) {
      return NextResponse.json(
        { ok: false, error: "Please fill in your name, email, assignment, and link." },
        { status: 400 },
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 },
      );
    }
    if (!isHttpUrl(link) || link.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "Please paste a valid link starting with https://" },
        { status: 400 },
      );
    }
    if (!(await assignmentOpen(assignment))) {
      return NextResponse.json(
        { ok: false, error: "Submissions for this assignment aren't open right now." },
        { status: 403 },
      );
    }

    await recordAndNotify({ name, email, assignment, note, link });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[submit/link] error", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
