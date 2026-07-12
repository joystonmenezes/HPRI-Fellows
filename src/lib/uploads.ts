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

export const MAX_DOC_BYTES = 20 * 1024 * 1024; // 20 MB for documents
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB for video
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

// Collapse a name/assignment into a filesystem- and URL-safe fragment.
export function safeName(s: string): string {
  return s.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 60) || "file";
}

export function extOf(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

export function limitFor(ext: string): number {
  return VIDEO_EXTS.has(ext) ? MAX_VIDEO_BYTES : MAX_DOC_BYTES;
}

export function tooLargeMessage(ext: string): string {
  return VIDEO_EXTS.has(ext)
    ? "Video is too large (maximum 500 MB)."
    : "File is too large (maximum 20 MB).";
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
// Failures to email are logged but don't fail the submission.
export async function recordAndNotify(input: {
  name: string;
  email: string;
  assignment: string;
  note: string;
  fileName: string;
  filePath: string;
  fileSize: number;
}): Promise<void> {
  await addSubmission({
    kind: "assignment",
    name: input.name,
    email: input.email,
    subject: input.assignment,
    message: input.note,
    fileName: input.fileName,
    filePath: input.filePath,
    fileSize: input.fileSize,
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
      replyTo: input.email,
      subject: `New assignment submission: ${input.assignment} — ${input.name}`,
      text: `${input.name} (${input.email}) submitted the assignment "${input.assignment}".\n\nReceived: ${when} (Los Angeles time)\n\nOpen the admin dashboard to view or download the file — it is not attached to this email.`,
    }).catch((e) => console.error("[submit] admin email failed", e));
  }
  await sendMail({
    to: input.email,
    subject: `Submission received: ${input.assignment} — HPRI Summer Fellows`,
    text: `Hi ${input.name},\n\nWe have received your submission for "${input.assignment}". Thank you!\n\nFile: ${input.fileName}\n\n— HPRI Summer Fellows Program`,
  }).catch((e) => console.error("[submit] confirmation email failed", e));
}
