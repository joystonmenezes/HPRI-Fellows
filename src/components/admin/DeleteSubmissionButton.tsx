"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Delete a single submission (assignment or contact message) from the admin
// dashboard. Asks for confirmation, calls the admin-only DELETE endpoint, then
// refreshes the server-rendered list so the row disappears.
export function DeleteSubmissionButton({
  id,
  what,
}: {
  id: number;
  what: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onDelete() {
    if (
      !window.confirm(
        `Delete this ${what}? This permanently removes it${
          what === "submission" ? ", including any uploaded file" : ""
        }. This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "DELETE",
      });
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
        onClick={onDelete}
        disabled={busy}
        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
    </div>
  );
}
