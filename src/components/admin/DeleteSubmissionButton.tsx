"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Delete a single submission (assignment or contact message) from the admin
// dashboard.
//   mode="trash" (default) → soft delete: moves the item to Recently Deleted,
//                            keeping the record and any uploaded file so it can
//                            be restored later.
//   mode="purge"           → permanent delete from Recently Deleted: erases the
//                            record and the uploaded file for good.
export function DeleteSubmissionButton({
  id,
  what,
  mode = "trash",
}: {
  id: number;
  what: string;
  mode?: "trash" | "purge";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const purge = mode === "purge";

  async function onClick() {
    const confirmMsg = purge
      ? `Permanently delete this ${what}? This erases it${
          what === "submission" ? ", including any uploaded file," : ""
        } for good and cannot be undone.`
      : `Delete this ${what}? It will move to Recently Deleted, where you can restore it later.`;
    if (!window.confirm(confirmMsg)) return;

    setBusy(true);
    setErr("");
    try {
      const res = await fetch(
        `/api/admin/submissions/${id}${purge ? "?permanent=1" : ""}`,
        { method: "DELETE" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not delete.");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete.");
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {busy
          ? purge
            ? "Deleting…"
            : "Removing…"
          : purge
            ? "Delete permanently"
            : "Delete"}
      </button>
      {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
    </div>
  );
}
