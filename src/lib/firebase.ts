import fs from "node:fs";
import path from "node:path";
import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// The @google-cloud/storage Bucket type, derived without adding a direct import.
type Bucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;

// Firebase Admin (server-only) initialisation.
//
// Credentials are loaded, in order of preference:
//   1. FIREBASE_SERVICE_ACCOUNT_B64 — base64 of the service-account JSON.
//      Use this on Vercel / any host where you can't ship a file.
//   2. service-account.json at the project root (git-ignored) for local dev.
//
// If neither is present, Firebase stays disabled and the app falls back to the
// local JSON file store, so the site still runs without credentials.
//
// Assignment uploads use Cloud Storage (see getBucket). The bucket name is read
// from FIREBASE_STORAGE_BUCKET, defaulting to "<projectId>.firebasestorage.app"
// (the default bucket name for Firebase projects).

type RawServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
};

function toServiceAccount(raw: RawServiceAccount): ServiceAccount | null {
  const projectId = raw.project_id ?? raw.projectId;
  const clientEmail = raw.client_email ?? raw.clientEmail;
  const privateKey = (raw.private_key ?? raw.privateKey)?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

function loadServiceAccount(): ServiceAccount | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64 && b64.trim()) {
    try {
      const json = JSON.parse(
        Buffer.from(b64.trim(), "base64").toString("utf8"),
      ) as RawServiceAccount;
      return toServiceAccount(json);
    } catch (e) {
      console.error("[firebase] FIREBASE_SERVICE_ACCOUNT_B64 is not valid base64 JSON", e);
      return null;
    }
  }
  try {
    const p = path.join(process.cwd(), "service-account.json");
    if (fs.existsSync(p)) {
      const json = JSON.parse(fs.readFileSync(p, "utf8")) as RawServiceAccount;
      return toServiceAccount(json);
    }
  } catch (e) {
    console.error("[firebase] could not read service-account.json", e);
  }
  return null;
}

// Remembered so the default Storage bucket name (<projectId>.appspot.com) can be
// derived when FIREBASE_STORAGE_BUCKET is not set explicitly.
let saProjectId: string | undefined;

function initApp(): App | null {
  const existing = getApps();
  if (existing.length) return existing[0];
  const sa = loadServiceAccount();
  if (!sa) return null;
  saProjectId = sa.projectId;
  try {
    return initializeApp({ credential: cert(sa) });
  } catch (e) {
    console.error("[firebase] initialisation failed", e);
    return null;
  }
}

// Cache the Firestore handle (or the fact that none is available) so we don't
// re-read credentials on every request.
let cached: { db: Firestore | null } | undefined;

export function getDb(): Firestore | null {
  if (cached) return cached.db;
  const app = initApp();
  const db = app ? getFirestore(app) : null;
  cached = { db };
  return db;
}

export function firebaseEnabled(): boolean {
  return getDb() !== null;
}

// Cloud Storage bucket for assignment uploads. The bucket name comes from
// FIREBASE_STORAGE_BUCKET, falling back to "<projectId>.appspot.com" (the
// default Firebase bucket). Returns null when Firebase is not configured, so
// callers fall back to local-disk storage for self-hosting.
let cachedBucket: { bucket: Bucket | null } | undefined;

export function getBucket(): Bucket | null {
  if (cachedBucket) return cachedBucket.bucket;
  const app = initApp();
  let bucket: Bucket | null = null;
  if (app) {
    const name =
      process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
      (saProjectId ? `${saProjectId}.firebasestorage.app` : undefined);
    if (name) {
      try {
        bucket = getStorage(app).bucket(name);
      } catch (e) {
        console.error("[firebase] storage bucket init failed", e);
      }
    } else {
      console.error("[firebase] no storage bucket name; set FIREBASE_STORAGE_BUCKET");
    }
  }
  cachedBucket = { bucket };
  return bucket;
}
