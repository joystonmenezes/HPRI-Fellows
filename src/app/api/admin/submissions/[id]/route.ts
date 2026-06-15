import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteSubmission,
  softDeleteSubmission,
  restoreSubmission,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only actions on a single submission (assignment or contact message).
//
//   DELETE               → soft delete: move it to "Recently Deleted".
//   DELETE ?permanent=1  → permanent delete: erase the record and any file.
//   PATCH                → restore a soft-deleted item to the active lists.
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id." }, { status: 400 });
  }
  const permanent = new URL(req.url).searchParams.get("permanent") === "1";
  try {
    const ok = permanent
      ? await deleteSubmission(id)
      : await softDeleteSubmission(id);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/submissions] delete error", e);
    return NextResponse.json(
      { ok: false, error: "Could not delete. Please try again." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id." }, { status: 400 });
  }
  try {
    const ok = await restoreSubmission(id);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/submissions] restore error", e);
    return NextResponse.json(
      { ok: false, error: "Could not restore. Please try again." },
      { status: 500 },
    );
  }
}
