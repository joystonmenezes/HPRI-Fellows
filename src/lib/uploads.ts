import crypto from "node:crypto";
import path from "node:path";
import { addSubmission } from "@/lib/store";
import { getContent, submissionState } from "@/lib/content";
import { sendMail, getAdminEmail, getAdminBcc } from "@/lib/email";

// Shared upload logic for assignment submissions. Used by three routes:
//   /api/submit/sign     — mint a signed URL for a direct browser→Storage upload
//   /api/submit/finalize — record the submission once the upload lands
//   /api/submit          — legacy fallback (whole file through the server) for
//                          local/self-host without Firebase configured
// Keeping the constants and helpers here means all three enforce the same rules.

// One 500 MB ceiling for every file type. Anything larger should be shared as a
// Drive link instead (see /api/submit/link) — the browser catches oversize files
// before uploading, and finalize re-checks the true size as a backstop.
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB
export const MAX_UPLOAD_MB = 500;
export const DOC_EXTS = new Set([".pdf", ".doc", ".docx"]);
export const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm"]);
export const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".mp4", ".mov", ".webm"];
export const CONTENT_TYPE: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Accept only well-formed http(s) links for the "submit a shareable link" path.
export function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Collapse a name/assignment into a filesystem- and URL-safe fragment.
export function safeName(s: string): string {
  return s.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 60) || "file";
}

export function extOf(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

export function limitFor(_ext?: string): number {
  return MAX_UPLOAD_BYTES;
}

export function tooLargeMessage(_ext?: string): string {
  return "That file is over the 500 MB limit. Upload it to your drive and submit a shareable link instead.";
}

// Build the stored object path (under uploads/) for a submission.
export function storedPathFor(name: string, assignment: string, ext: string): string {
  return `uploads/${Date.now()}_${safeName(name)}_${safeName(assignment)}${ext}`;
}

// The admin's per-assignment gate, enforced server-side: submissions are only
// accepted for an assignment the admin has actually opened for submission.
export async function assignmentOpen(assignment: string): Promise<boolean> {
  const content = await getContent();
  const target = content.assignments.rows.find((r) => r.assignment === assignment);
  return !!target && submissionState(target) === "open";
}

// HMAC token that binds a storage path we issued, so the finalize step can't be
// pointed at an arbitrary existing object. Signed with SESSION_SECRET (the same
// secret used for admin session cookies), falling back to ADMIN_PASSWORD.
function uploadSecret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function signPath(storedPath: string): string {
  return crypto.createHmac("sha256", uploadSecret()).update(storedPath).digest("hex");
}

export function verifyPath(storedPath: string, token: string): boolean {
  const expected = Buffer.from(signPath(storedPath));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Record the submission and send the two notification emails (admin + student).
// A submission is either an uploaded file (fileName/filePath/fileSize) or a
// shared link. Only defined keys are written, so Firestore never sees undefined.
// Failures to email are logged but don't fail the submission.
export async function recordAndNotify(input: {
  name: string;
  email: string;
  assignment: string;
  note: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  link?: string;
}): Promise<void> {
  await addSubmission({
    kind: "assignment",
    name: input.name,
    email: input.email,
    subject: input.assignment,
    message: input.note,
    ...(input.fileName ? { fileName: input.fileName } : {}),
    ...(input.filePath ? { filePath: input.filePath } : {}),
    ...(input.fileSize ? { fileSize: input.fileSize } : {}),
    ...(input.link ? { link: input.link } : {}),
  });

  const admin = getAdminEmail();
  if (admin) {
    const when = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Los_Angeles",
    });
    const detail = input.link
      ? `They submitted a shared link:\n${input.link}\n\n(Also shown in the admin dashboard.)`
      : `Open the admin dashboard to view or download the file — it is not attached to this email.`;
    await sendMail({
      to: admin,
      bcc: getAdminBcc() || undefined,
      replyTo: input.email,
      subject: `New assignment submission: ${input.assignment} — ${input.name}`,
      text: `${input.name} (${input.email}) submitted the assignment "${input.assignment}".\n\nReceived: ${when} (Los Angeles time)\n\n${detail}`,
    }).catch((e) => console.error("[submit] admin email failed", e));
  }
  const studentDetail = input.link
    ? `Link: ${input.link}`
    : `File: ${input.fileName}`;
  await sendMail({
    to: input.email,
    subject: `Submission received: ${input.assignment} — HPRI Summer Fellows`,
    text: `Hi ${input.name},\n\nWe have received your submission for "${input.assignment}". Thank you!\n\n${studentDetail}\n\n— HPRI Summer Fellows Program`,
  }).catch((e) => console.error("[submit] confirmation email failed", e));
}
