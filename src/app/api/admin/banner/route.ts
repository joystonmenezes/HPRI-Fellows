import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { getBucket } from "@/lib/firebase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

function safe(s: string) {
  return s.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 60) || "image";
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

// Admin-only upload for hero banner photos. Banner images are public marketing
// photos (unlike student submissions), so they are served publicly by
// /api/banner/[name]; only the upload is gated behind the admin session. With
// Firebase configured the bytes go to the bucket's "banner/" prefix; otherwise
// to data/banner on local disk (self-hosting / dev).
export async function POST(req: Request) {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!isUpload(file) || file.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Please choose an image." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Image is too large (maximum 8 MB)." },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!TYPES[ext]) {
      return NextResponse.json(
        { ok: false, error: "Use a JPG, PNG, WebP, GIF, or AVIF image." },
        { status: 400 },
      );
    }

    const stored = `${Date.now()}_${safe(path.basename(file.name, ext))}${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const bucket = getBucket();
    if (bucket) {
      await bucket.file(`banner/${stored}`).save(bytes, {
        resumable: false,
        contentType: TYPES[ext],
        metadata: { cacheControl: "public, max-age=86400" },
      });
    } else {
      const dir = path.join(process.cwd(), "data", "banner");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, stored), bytes);
    }

    return NextResponse.json({
      ok: true,
      url: `/api/banner/${encodeURIComponent(stored)}`,
    });
  } catch (e) {
    console.error("[admin/banner] upload error", e);
    return NextResponse.json(
      { ok: false, error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
