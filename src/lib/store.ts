import fs from "node:fs";
import path from "node:path";
import { getDb, getBucket } from "@/lib/firebase";

// Store for form submissions. When Firebase is configured, submissions live in
// the Firestore collection "submissions" (so they persist on serverless hosts
// like Vercel). Otherwise we fall back to a local data/submissions.json file —
// ideal for self-hosting with no external database.

const dataDir = path.join(process.cwd(), "data");
const file = path.join(dataDir, "submissions.json");
const COLLECTION = "submissions";

export type Submission = {
  id: number;
  kind: "contact" | "assignment";
  name: string;
  email: string;
  subject?: string;
  message?: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  // Set instead of the file fields when a fellow submits a shareable link
  // (e.g. a Google Drive video) rather than uploading the file directly.
  link?: string;
  createdAt: string;
  // Grading workflow (admin-only). Several staff grade submissions, so we track
  // whether an item has been graded and who marked it — surfaced in the
  // dashboard's per-submission grading controls. Absent means not yet graded.
  graded?: boolean;
  gradedBy?: string;
  // Set to an ISO timestamp when the item is moved to "Recently Deleted".
  // Absent/null means active. Soft-deleting keeps the row and any uploaded file
  // so it can be restored; only a permanent delete removes them.
  deletedAt?: string | null;
};

// ── Local-file fallback ─────────────────────────────────────────────────────

function ensure() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
}

function readFile(): Submission[] {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Submission[];
  } catch {
    return [];
  }
}

function writeFile(all: Submission[]): void {
  ensure();
  // Write to a temp file then rename, so a crash mid-write can't corrupt the store.
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(all, null, 2));
  fs.renameSync(tmp, file);
}

// ── Public API: Firestore (preferred) with local-file fallback ──────────────

// All submissions, both active and soft-deleted (internal helper).
async function listAll(): Promise<Submission[]> {
  const db = getDb();
  if (db) {
    try {
      const snap = await db
        .collection(COLLECTION)
        .orderBy("createdAt", "asc")
        .get();
      return snap.docs.map((d) => d.data() as Submission);
    } catch (e) {
      console.error("[store] Firestore read failed; using file", e);
      return readFile();
    }
  }
  return readFile();
}

// Active submissions only — excludes anything moved to Recently Deleted.
export async function listSubmissions(): Promise<Submission[]> {
  return (await listAll()).filter((s) => !s.deletedAt);
}

// Soft-deleted submissions ("Recently Deleted"), most-recently-deleted first.
export async function listDeletedSubmissions(): Promise<Submission[]> {
  return (await listAll())
    .filter((s) => s.deletedAt)
    .sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
}

export async function addSubmission(
  input: Omit<Submission, "id" | "createdAt">,
): Promise<Submission> {
  const item: Submission = {
    ...input,
    // Millisecond timestamp: unique enough for this volume and monotonic, so
    // listings sort newest-last regardless of backend.
    id: Date.now(),
    createdAt: new Date().toISOString(),
  };

  const db = getDb();
  if (db) {
    await db.collection(COLLECTION).add(item);
    return item;
  }

  const all = readFile();
  all.push(item);
  writeFile(all);
  return item;
}

// Permanently remove a submission (assignment or contact message) by its id.
// Any uploaded file is deleted too, best-effort, so nothing is left orphaned in
// Storage / on disk. Returns false if no matching submission was found.
export async function deleteSubmission(id: number): Promise<boolean> {
  const db = getDb();
  if (db) {
    const snap = await db.collection(COLLECTION).where("id", "==", id).get();
    if (snap.empty) return false;
    const bucket = getBucket();
    for (const doc of snap.docs) {
      const data = doc.data() as Submission;
      if (bucket && data.filePath) {
        await bucket
          .file(data.filePath)
          .delete()
          .catch((e) => console.error("[store] upload delete failed", e));
      }
      await doc.ref.delete();
    }
    return true;
  }

  const all = readFile();
  const item = all.find((s) => s.id === id);
  if (!item) return false;
  if (item.filePath) {
    // filePath is stored as "uploads/<name>"; local copies live under data/.
    try {
      const local = path.join(dataDir, item.filePath);
      if (fs.existsSync(local)) fs.unlinkSync(local);
    } catch (e) {
      console.error("[store] local upload delete failed", e);
    }
  }
  writeFile(all.filter((s) => s.id !== id));
  return true;
}

// Move a submission to "Recently Deleted" without destroying anything: the
// Firestore doc and any uploaded file are kept, just flagged with a deletedAt
// timestamp so it drops out of the active lists but can be restored later.
export async function softDeleteSubmission(id: number): Promise<boolean> {
  return setDeletedAt(id, new Date().toISOString());
}

// Restore a soft-deleted submission back into the active lists.
export async function restoreSubmission(id: number): Promise<boolean> {
  return setDeletedAt(id, null);
}

// Update a submission's grading status: whether it has been graded and who
// marked it. Only the fields actually provided are written, so an undefined
// stays untouched. gradedBy is trimmed and length-capped. Returns false if no
// submission matches the id.
export async function setSubmissionGrading(
  id: number,
  patch: { graded?: boolean; gradedBy?: string },
): Promise<boolean> {
  const update: { graded?: boolean; gradedBy?: string } = {};
  if (typeof patch.graded === "boolean") update.graded = patch.graded;
  if (typeof patch.gradedBy === "string") {
    update.gradedBy = patch.gradedBy.trim().slice(0, 80);
  }
  if (Object.keys(update).length === 0) return false;

  const db = getDb();
  if (db) {
    const snap = await db.collection(COLLECTION).where("id", "==", id).get();
    if (snap.empty) return false;
    for (const doc of snap.docs) {
      await doc.ref.update(update);
    }
    return true;
  }

  const all = readFile();
  if (!all.some((s) => s.id === id)) return false;
  writeFile(all.map((s) => (s.id === id ? { ...s, ...update } : s)));
  return true;
}

async function setDeletedAt(id: number, value: string | null): Promise<boolean> {
  const db = getDb();
  if (db) {
    const snap = await db.collection(COLLECTION).where("id", "==", id).get();
    if (snap.empty) return false;
    for (const doc of snap.docs) {
      await doc.ref.update({ deletedAt: value });
    }
    return true;
  }

  const all = readFile();
  if (!all.some((s) => s.id === id)) return false;
  writeFile(all.map((s) => (s.id === id ? { ...s, deletedAt: value } : s)));
  return true;
}
