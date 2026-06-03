import fs from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/firebase";

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
  createdAt: string;
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

export async function listSubmissions(): Promise<Submission[]> {
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
