"use client";

import { useRef, useState } from "react";

// Per-submission grading controls shown on every assignment row: a "Graded"
// checkbox and a "Graded by" name field, so the several staff who grade can see
// at a glance what's done and who did it. Saves are optimistic and hit the
// admin PATCH endpoint directly (no full-page refresh), so expanded sections
// stay put while grading.
type Status = "idle" | "saving" | "saved" | "error";

export function GradingControls({
  id,
  graded: initialGraded,
  gradedBy: initialGradedBy,
  onGradedChange,
}: {
  id: number;
  graded?: boolean;
  gradedBy?: string;
  // Notifies the parent when the graded flag flips, so the group's "X/Y graded"
  // tally can update live without a full-page refresh.
  onGradedChange?: (graded: boolean) => void;
}) {
  const [graded, setGraded] = useState(!!initialGraded);
  const [gradedBy, setGradedBy] = useState(initialGradedBy ?? "");
  const [status, setStatus] = useState<Status>("idle");
  // The last value confirmed saved, so blurring an unchanged field is a no-op.
  const savedName = useRef(initialGradedBy ?? "");

  async function save(next: { graded: boolean; gradedBy: string }) {
    setStatus("saving");
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      savedName.current = next.gradedBy;
      setStatus("saved");
      window.setTimeout(
        () => setStatus((s) => (s === "saved" ? "idle" : s)),
        1500,
      );
    } catch {
      setStatus("error");
    }
  }

  function onToggle(checked: boolean) {
    setGraded(checked);
    onGradedChange?.(checked);
    save({ graded: checked, gradedBy });
  }

  function commitName() {
    const trimmed = gradedBy.trim();
    if (trimmed === savedName.current.trim()) return;
    save({ graded, gradedBy: trimmed });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <label
        className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-neutral-600"
        title="Mark this submission as graded"
      >
        <input
          type="checkbox"
          checked={graded}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-cardinal focus:ring-cardinal"
        />
        Graded
      </label>
      <input
        type="text"
        value={gradedBy}
        onChange={(e) => setGradedBy(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Graded by…"
        aria-label="Graded by"
        className="w-28 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-cardinal focus:outline-none focus:ring-1 focus:ring-cardinal"
      />
      <span
        aria-live="polite"
        className={`w-10 text-[11px] ${
          status === "error" ? "text-red-600" : "text-neutral-400"
        }`}
      >
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "Saved"
            : status === "error"
              ? "Retry"
              : ""}
      </span>
    </div>
  );
}
