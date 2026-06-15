"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Restore a soft-deleted submission (from Recently Deleted) back into the active
// lists. Calls the admin-only PATCH endpoint, then refreshes the dashboard.
export function RestoreSubmissionButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onRestore() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not restore.");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not restore.");
      setBusy(false);
    }
  }

  return (
    <div className="inline-block text-right">
      <button
        type="button"
        onClick={onRestore}
        disabled={busy}
        className="rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
      >
        {busy ? "Restoring…" : "Restore"}
      </button>
      {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
    </div>
  );
}
