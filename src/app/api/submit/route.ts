import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
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
  recordAndNotify,
} from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fallback upload path: the whole file is posted to the server, which stores it
// in the bucket (or on local disk when Firebase isn't configured). Production
// uses the direct-to-Storage flow (/api/submit/sign + /finalize) instead, which
// avoids the ~32 MB Cloud Run request-body limit for large videos. This route
// stays for local/self-host and as a belt-and-suspenders fallback.

// Duck-typed File check (avoids relying on a global File constructor on Node 18).
function isUpload(f: FormDataEntryValue | null): f is File {
  return (
    !!f &&
    typeof f === "object" &&
    "arrayBuffer" in f &&
    "name" in f &&
    "size" in f
  );
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    if (String(form.get("company") || "").trim()) {
      return NextResponse.json({ ok: true });
    }

    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const assignment = String(form.get("assignment") || "").trim();
    const note = String(form.get("note") || "").trim();
    const file = form.get("file");

    if (!name || !email || !assignment) {
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

    // Enforce the admin's per-assignment gate server-side.
    if (!(await assignmentOpen(assignment))) {
      return NextResponse.json(
        { ok: false, error: "Submissions for this assignment aren't open right now." },
        { status: 403 },
      );
    }

    if (!isUpload(file) || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Please attach your file." },
        { status: 400 },
      );
    }
    const ext = extOf(file.name);
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
    const isVideo = VIDEO_EXTS.has(ext);
    if (file.size > limitFor(ext)) {
      return NextResponse.json(
        { ok: false, error: tooLargeMessage(ext) },
        { status: 400 },
      );
    }

    // Store uploads privately (never under /public). With Firebase configured the
    // bytes go to the bucket's "uploads/" prefix; otherwise to data/uploads on
    // local disk (self-hosting).
    const stored = storedPathFor(name, assignment, ext);
    const bytes = Buffer.from(await file.arrayBuffer());
    const bucket = getBucket();
    if (bucket) {
      await bucket.file(stored).save(bytes, {
        resumable: isVideo,
        contentType: CONTENT_TYPE[ext] || "application/octet-stream",
        metadata: { cacheControl: "private, no-store" },
      });
    } else {
      const uploadsDir = path.join(process.cwd(), "data", "uploads");
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, stored.replace(/^uploads\//, "")), bytes);
    }

    await recordAndNotify({
      name,
      email,
      assignment,
      note,
      fileName: file.name,
      filePath: stored,
      fileSize: file.size,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[submit] error", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
