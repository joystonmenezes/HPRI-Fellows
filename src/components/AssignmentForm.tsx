"use client";

import { useState } from "react";

const labelClass = "block text-sm font-semibold text-neutral-800";
const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-cardinal focus:outline-none";

type Status = "idle" | "submitting" | "success" | "error";

// PUT/POST a body with real upload-progress reporting. Native fetch() can't
// report upload progress, so we use XMLHttpRequest.
function xhrSend(
  method: string,
  url: string,
  body: XMLHttpRequestBodyInit,
  contentType: string | undefined,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      // Our own endpoints return JSON with an error; Cloud Storage returns XML.
      let msg = "Upload failed. Please try again.";
      try {
        const j = JSON.parse(xhr.responseText) as { error?: string };
        if (j?.error) msg = j.error;
      } catch {
        /* non-JSON (e.g. Storage XML) — keep the generic message */
      }
      reject(new Error(msg));
    });
    xhr.addEventListener("error", () =>
      reject(new Error("Network error. Please try again.")),
    );
    xhr.open(method, url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(body);
  });
}

async function postJson(url: string, data: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    [k: string]: unknown;
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Something went wrong. Please try again.");
  }
  return json;
}

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
    const fd = new FormData(form);

    const company = String(fd.get("company") || "").trim();
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const assignment = String(fd.get("assignment") || "").trim();
    const note = String(fd.get("note") || "").trim();
    const file = fd.get("file");
    const isFile =
      !!file && typeof file === "object" && "size" in file && "name" in file;

    if (!isFile || (file as File).size === 0) {
      setStatus("error");
      setError("Please attach your file.");
      return;
    }
    const upload = file as File;

    setStatus("submitting");
    setProgress(0);
    setError("");
    try {
      // 1) Ask the server for a signed upload URL (a tiny JSON request).
      const sign = await postJson("/api/submit/sign", {
        company,
        name,
        email,
        assignment,
        fileName: upload.name,
        fileSize: upload.size,
      });

      if (sign.mode === "noop") {
        // Honeypot tripped server-side — behave like a normal success.
        setStatus("success");
        setProgress(null);
        form.reset();
        onSuccess?.();
        return;
      }

      if (sign.mode === "direct") {
        // No Storage configured (local/self-host): post the whole form instead.
        await xhrSend("POST", "/api/submit", fd, undefined, setProgress);
      } else {
        // 2) Upload the bytes straight to Cloud Storage (skips our server).
        await xhrSend(
          "PUT",
          String(sign.url),
          upload,
          String(sign.contentType),
          setProgress,
        );
        // 3) Tell the server the upload finished → record it + send emails.
        await postJson("/api/submit/finalize", {
          name,
          email,
          assignment,
          note,
          path: sign.path,
          token: sign.token,
          fileName: upload.name,
        });
      }

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
            <span>{progress < 100 ? "Uploading…" : "Finishing up…"}</span>
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
