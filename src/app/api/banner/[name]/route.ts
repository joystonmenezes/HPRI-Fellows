import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getBucket } from "@/lib/firebase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

// Public serving of hero banner photos uploaded via /api/admin/banner. These
// are intentionally public (they appear on the home page). Only a bare filename
// from inside the "banner/" prefix is ever served — anything that could escape
// the directory is rejected.
export async function GET(
  _req: Request,
  { params }: { params: { name: string } },
) {
  const name = decodeURIComponent(params.name || "");
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
    return NextResponse.json({ ok: false, error: "Invalid file." }, { status: 400 });
  }

  const ext = path.extname(name).toLowerCase();
  if (!TYPES[ext]) {
    return NextResponse.json({ ok: false, error: "Invalid file." }, { status: 400 });
  }

  const bucket = getBucket();
  let bytes: Buffer;
  if (bucket) {
    const f = bucket.file(`banner/${name}`);
    const [exists] = await f.exists();
    if (!exists) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    const [buf] = await f.download();
    bytes = buf;
  } else {
    const dir = path.join(process.cwd(), "data", "banner");
    const full = path.join(dir, name);
    const resolved = path.resolve(full);
    if (resolved !== full || !resolved.startsWith(dir + path.sep)) {
      return NextResponse.json({ ok: false, error: "Invalid file." }, { status: 400 });
    }
    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    bytes = fs.readFileSync(resolved);
  }

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
