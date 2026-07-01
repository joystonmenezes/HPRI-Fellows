"use client";

import { useState } from "react";

const labelClass = "block text-sm font-semibold text-neutral-800";
const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-cardinal focus:outline-none";

type Status = "idle" | "submitting" | "success" | "error";

export function AssignmentForm({
  assignments,
  defaultAssignment = "",
  onSuccess,
}: {
  assignments: string[];
  defaultAssignment?: string;
  onSuccess?: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("submitting");
    setProgress(0);
    setError("");
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        });
        xhr.addEventListener("load", () => {
          try {
            const json = JSON.parse(xhr.responseText) as { ok: boolean; error?: string };
            if (xhr.status >= 200 && xhr.status < 300 && json.ok) resolve();
            else reject(new Error(json.error || "Could not submit your file."));
          } catch {
            reject(new Error("Could not submit your file."));
          }
        });
        xhr.addEventListener("error", () =>
          reject(new Error("Network error. Please try again.")),
        );
        xhr.open("POST", "/api/submit");
        xhr.send(new FormData(form));
      });
      setStatus("success");
      setProgress(null);
      form.reset();
      onSuccess?.();
    } catch (err) {
      setStatus("error");
      setProgress(null);
      setError(err instanceof Error ? err.message : "Could not submit your file.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800"
      >
        Submission received — thank you! A confirmation email is on its way. You
        can resubmit before the deadline if you need to update your file.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="a-name" className={labelClass}>
            Name
          </label>
          <input id="a-name" name="name" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="a-email" className={labelClass}>
            Email
          </label>
          <input
            id="a-email"
            name="email"
            type="email"
            required
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="a-assignment" className={labelClass}>
          Assignment
        </label>
        <select
          id="a-assignment"
          name="assignment"
          required
          defaultValue={defaultAssignment}
          className={inputClass}
        >
          <option value="" disabled>
            Choose an assignment…
          </option>
          {assignments.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="a-file" className={labelClass}>
          File{" "}
          <span className="font-normal text-neutral-400">
            (PDF, Word, or video — MP4/MOV/WEBM up to 500 MB)
          </span>
        </label>
        <input
          id="a-file"
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,.mp4,.mov,.webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/quicktime,video/webm"
          className="mt-1 block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-cardinal file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cardinal-dark"
        />
      </div>
      <div>
        <label htmlFor="a-note" className={labelClass}>
          Note <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <textarea id="a-note" name="note" rows={3} className={inputClass} />
      </div>
      {status === "submitting" && progress !== null ? (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-neutral-600">
            <span>Uploading…</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-cardinal transition-all duration-200"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center rounded-md bg-cardinal px-4 py-2 text-sm font-semibold text-white transition hover:bg-cardinal-dark disabled:opacity-60"
        >
          {status === "submitting" ? "Uploading…" : "Submit assignment"}
        </button>
      </div>
    </form>
  );
}
