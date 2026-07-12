import { NextResponse } from "next/server";
import { getBucket } from "@/lib/firebase";
import {
  isEmail,
  extOf,
  ALLOWED_EXT,
  limitFor,
  tooLargeMessage,
  assignmentOpen,
  verifyPath,
  recordAndNotify,
} from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Step 2 of the direct-to-Storage upload. Called once the browser has PUT the
// file to the signed URL. Verifies the object really landed (and its true size),
// then records the submission and sends the notification emails.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const assignment = String(body?.assignment || "").trim();
    const note = String(body?.note || "").trim();
    const filePath = String(body?.path || "").trim();
    const token = String(body?.token || "").trim();
    const fileName = String(body?.fileName || "").trim();

    if (!name || !email || !assignment || !filePath || !token) {
      return NextResponse.json(
        { ok: false, error: "Missing submission details." },
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

    // The path must be one we handed out (HMAC), inside uploads/, allowed ext.
    if (!filePath.startsWith("uploads/") || !verifyPath(filePath, token)) {
      return NextResponse.json(
        { ok: false, error: "Upload could not be verified. Please try again." },
        { status: 400 },
      );
    }
    const ext = extOf(filePath);
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type." },
        { status: 400 },
      );
    }

    const bucket = getBucket();
    if (!bucket) {
      return NextResponse.json(
        { ok: false, error: "Storage is not configured." },
        { status: 500 },
      );
    }

    // Confirm the upload actually landed and read its true size from Storage.
    const gcsFile = bucket.file(filePath);
    const [exists] = await gcsFile.exists();
    if (!exists) {
      return NextResponse.json(
        { ok: false, error: "We didn't receive the file. Please try uploading again." },
        { status: 400 },
      );
    }
    const [meta] = await gcsFile.getMetadata();
    const fileSize = Number(meta.size || 0);
    if (fileSize <= 0 || fileSize > limitFor(ext)) {
      // Remove an empty or over-size object so it doesn't linger in the bucket.
      await gcsFile.delete().catch(() => {});
      return NextResponse.json(
        { ok: false, error: fileSize <= 0 ? "The uploaded file was empty." : tooLargeMessage(ext) },
        { status: 400 },
      );
    }
    // Uploads are private; the admin serves them through an authenticated route.
    await gcsFile.setMetadata({ cacheControl: "private, no-store" }).catch(() => {});

    await recordAndNotify({
      name,
      email,
      assignment,
      note,
      fileName: fileName || filePath.replace(/^uploads\//, ""),
      filePath,
      fileSize,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[submit/finalize] error", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
