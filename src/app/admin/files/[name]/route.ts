import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { getBucket } from "@/lib/firebase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  req: Request,
  { params }: { params: { name: string } },
) {
  if (!getSession()) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // Only ever serve a bare filename from inside data/uploads — reject anything
  // that could escape the directory.
  const name = decodeURIComponent(params.name || "");
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
    return NextResponse.json({ ok: false, error: "Invalid file." }, { status: 400 });
  }

  const ext = path.extname(name).toLowerCase();
  const bucket = getBucket();

  let bytes: Buffer;
  if (bucket) {
    // Files live under the "uploads/" prefix; `name` is already validated to be
    // a bare filename, so this can't escape the prefix.
    const f = bucket.file(`uploads/${name}`);
    const [exists] = await f.exists();
    if (!exists) {
      return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
    }
    const [buf] = await f.download();
    bytes = buf;
  } else {
    const uploadsDir = path.join(process.cwd(), "data", "uploads");
    const full = path.join(uploadsDir, name);
    const resolved = path.resolve(full);
    if (resolved !== full || !resolved.startsWith(uploadsDir + path.sep)) {
      return NextResponse.json({ ok: false, error: "Invalid file." }, { status: 400 });
    }
    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
    }
    bytes = fs.readFileSync(resolved);
  }

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
