import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { addSubmission } from "@/lib/store";
import { getBucket } from "@/lib/firebase";
import { getContent, submissionState } from "@/lib/content";
import { sendMail, getAdminEmail, getAdminBcc } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_EXT = [".pdf", ".doc", ".docx"];
const CONTENT_TYPE: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function safe(s: string) {
  return s.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 60) || "file";
}

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

    // Enforce the admin's per-assignment gate server-side: even if a stale page
    // or crafted request reaches us, reject uploads for assignments that the
    // admin has not opened for submission.
    const content = await getContent();
    const target = content.assignments.rows.find(
      (r) => r.assignment === assignment,
    );
    if (!target || submissionState(target) !== "open") {
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
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File is too large (maximum 20 MB)." },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { ok: false, error: "Only PDF or Word files (.pdf, .doc, .docx) are allowed." },
        { status: 400 },
      );
    }

    // Store uploads privately (never under /public) so they aren't publicly
    // downloadable — the admin dashboard serves them through an authenticated
    // route. With Firebase configured the bytes go to the bucket's "uploads/"
    // prefix; otherwise to data/uploads on local disk (self-hosting).
    const stored = `${Date.now()}_${safe(name)}_${safe(assignment)}${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const bucket = getBucket();
    if (bucket) {
      await bucket.file(`uploads/${stored}`).save(bytes, {
        resumable: false,
        contentType: CONTENT_TYPE[ext] || "application/octet-stream",
        metadata: { cacheControl: "private, no-store" },
      });
    } else {
      const uploadsDir = path.join(process.cwd(), "data", "uploads");
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, stored), bytes);
    }

    await addSubmission({
      kind: "assignment",
      name,
      email,
      subject: assignment,
      message: note,
      fileName: file.name,
      filePath: `uploads/${stored}`,
      fileSize: file.size,
    });

    const admin = getAdminEmail();
    if (admin) {
      const when = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Los_Angeles",
      });
      await sendMail({
        to: admin,
        bcc: getAdminBcc() || undefined,
        replyTo: email,
        subject: `New assignment submission: ${assignment} — ${name}`,
        text: `${name} (${email}) submitted the assignment "${assignment}".\n\nReceived: ${when} (Los Angeles time)\n\nOpen the admin dashboard to view or download the file — it is not attached to this email.`,
      }).catch((e) => console.error("[submit] admin email failed", e));
    }
    await sendMail({
      to: email,
      subject: `Submission received: ${assignment} — HPRI Summer Fellows`,
      text: `Hi ${name},\n\nWe have received your submission for "${assignment}". Thank you!\n\nFile: ${file.name}\n\n— HPRI Summer Fellows Program`,
    }).catch((e) => console.error("[submit] confirmation email failed", e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[submit] error", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
