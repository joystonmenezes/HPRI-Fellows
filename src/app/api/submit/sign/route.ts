import { NextResponse } from "next/server";
import { getBucket } from "@/lib/firebase";
import {
  isEmail,
  extOf,
  ALLOWED_EXT,
  VIDEO_EXTS,
  CONTENT_TYPE,
  limitFor,
  tooLargeMessage,
  assignmentOpen,
  storedPathFor,
  signPath,
} from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Step 1 of the direct-to-Storage upload. Validates the submission details and
// returns a short-lived signed URL the browser can PUT the file straight to,
// bypassing the ~32 MB Cloud Run request-body limit. When Firebase isn't
// configured (local/self-host) it returns { mode: "direct" } so the client
// falls back to posting the file to /api/submit instead.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    // Honeypot: a filled "company" field means a bot. Pretend success.
    if (String(body?.company || "").trim()) {
      return NextResponse.json({ ok: true, mode: "noop" });
    }

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const assignment = String(body?.assignment || "").trim();
    const fileName = String(body?.fileName || "").trim();
    const fileSize = Number(body?.fileSize || 0);

    if (!name || !email || !assignment || !fileName) {
      return NextResponse.json(
        { ok: false, error: "Please fill in your name, email, and assignment." },
        { status: 400 },
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 },
      );
    }
    if (!(await assignmentOpen(assignment))) {
      return NextResponse.json(
        { ok: false, error: "Submissions for this assignment aren't open right now." },
        { status: 403 },
      );
    }

    const ext = extOf(fileName);
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only PDF, Word (.pdf, .doc, .docx) or video (.mp4, .mov, .webm) files are allowed.",
        },
        { status: 400 },
      );
    }
    // The browser reports its own size, so this is an early nicety, not the real
    // guard — finalize re-checks the true size from Storage after the upload.
    if (fileSize > 0 && fileSize > limitFor(ext)) {
      return NextResponse.json(
        { ok: false, error: tooLargeMessage(ext) },
        { status: 400 },
      );
    }

    const bucket = getBucket();
    if (!bucket) {
      // No Firebase Storage available — the client posts the file to /api/submit.
      return NextResponse.json({ ok: true, mode: "direct" });
    }

    const contentType = CONTENT_TYPE[ext] || "application/octet-stream";
    const storedPath = storedPathFor(name, assignment, ext);
    const [url] = await bucket.file(storedPath).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    return NextResponse.json({
      ok: true,
      mode: "signed",
      url,
      path: storedPath,
      token: signPath(storedPath),
      contentType,
    });
  } catch (e) {
    console.error("[submit/sign] error", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
