import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteSubmission,
  softDeleteSubmission,
  restoreSubmission,
  setSubmissionGrading,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only actions on a single submission (assignment or contact message).
//
//   DELETE               → soft delete: move it to "Recently Deleted".
//   DELETE ?permanent=1  → permanent delete: erase the record and any file.
//   PATCH { graded?, gradedBy? } → update grading status.
//   PATCH (no body)      → restore a soft-deleted item to the active lists.
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

  // A JSON body with grading fields updates the grading status; a bodyless PATCH
  // (from the Restore button) restores a soft-deleted item.
  const body = await req.json().catch(() => null);
  const isGrading =
    body != null &&
    (typeof body.graded === "boolean" || typeof body.gradedBy === "string");

  try {
    const ok = isGrading
      ? await setSubmissionGrading(id, {
          graded: typeof body.graded === "boolean" ? body.graded : undefined,
          gradedBy:
            typeof body.gradedBy === "string" ? body.gradedBy : undefined,
        })
      : await restoreSubmission(id);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/submissions] patch error", e);
    return NextResponse.json(
      {
        ok: false,
        error: isGrading
          ? "Could not save grading. Please try again."
          : "Could not restore. Please try again.",
      },
      { status: 500 },
    );
  }
}
