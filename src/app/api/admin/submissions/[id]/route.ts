import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteSubmission } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only deletion of a single submission (assignment or contact message).
export async function DELETE(
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
    const ok = await deleteSubmission(id);
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
