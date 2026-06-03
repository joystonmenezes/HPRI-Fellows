import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listSubmissions } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Quote every field, double inner quotes, and neutralise leading characters
// that spreadsheet apps would treat as a formula (CSV injection defence).
function cell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const COLUMNS: { key: string; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "createdAt", label: "Received" },
  { key: "kind", label: "Type" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "subject", label: "Subject / Assignment" },
  { key: "message", label: "Message / Note" },
  { key: "fileName", label: "File name" },
  { key: "fileSize", label: "File size (bytes)" },
];

export async function GET(req: Request) {
  if (!getSession()) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const rows = await listSubmissions();
  const header = COLUMNS.map((c) => cell(c.label)).join(",");
  const body = rows
    .map((r) => COLUMNS.map((c) => cell((r as Record<string, unknown>)[c.key])).join(","))
    .join("\r\n");
  // Leading BOM so Excel reads UTF-8 (accented names, em dashes) correctly.
  const csv = `﻿${header}\r\n${body}\r\n`;

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fellows-submissions-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
