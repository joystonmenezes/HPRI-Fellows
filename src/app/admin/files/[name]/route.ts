import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { getSession } from "@/lib/auth";
import { getBucket } from "@/lib/firebase";
import { CONTENT_TYPE } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (bucket) {
    // Files live under the "uploads/" prefix; `name` is already validated to be
    // a bare filename, so this can't escape the prefix.
    const f = bucket.file(`uploads/${name}`);
    const [exists] = await f.exists();
    if (!exists) {
      return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
    }
    // Redirect the browser to a short-lived signed URL so the file downloads
    // straight from Cloud Storage. Streaming the bytes back through the server
    // would hit Cloud Run's ~32 MB response limit and fail for large videos.
    const [url] = await f.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      responseDisposition: `attachment; filename="${name}"`,
      responseType: CONTENT_TYPE[ext] || "application/octet-stream",
    });
    return NextResponse.redirect(url);
  }

  // Local-disk fallback (self-hosting without Firebase): stream from disk so we
  // don't buffer a whole large file into memory.
  const uploadsDir = path.join(process.cwd(), "data", "uploads");
  const full = path.join(uploadsDir, name);
  const resolved = path.resolve(full);
  if (resolved !== full || !resolved.startsWith(uploadsDir + path.sep)) {
    return NextResponse.json({ ok: false, error: "Invalid file." }, { status: 400 });
  }
  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
  }
  const stat = fs.statSync(resolved);
  const webStream = Readable.toWeb(
    fs.createReadStream(resolved),
  ) as unknown as ReadableStream<Uint8Array>;
  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPE[ext] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": String(stat.size),
      "Cache-Control": "private, no-store",
    },
  });
}
