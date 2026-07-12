"use client";

import { useState } from "react";

const labelClass = "block text-sm font-semibold text-neutral-800";
const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-cardinal focus:outline-none";

const MAX_MB = 500;
const MAX_BYTES = MAX_MB * 1024 * 1024;

type Status = "idle" | "submitting" | "success" | "error";
type Mode = "file" | "link";

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
  const [mode, setMode] = useState<Mode>("file");
  const [link, setLink] = useState("");
  // When a chosen file is over the limit we auto-switch to link mode and show
  // which file was too big.
  const [oversize, setOversize] = useState<{ name: string; mb: number } | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setError("");
    if (f && f.size > MAX_BYTES) {
      setOversize({ name: f.name, mb: Math.ceil(f.size / (1024 * 1024)) });
      setMode("link");
      e.target.value = ""; // don't keep the too-big file selected
    } else {
      setOversize(null);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const company = String(fd.get("company") || "").trim();
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const assignment = String(fd.get("assignment") || "").trim();
    const note = String(fd.get("note") || "").trim();

    // ── Link submission ──────────────────────────────────────────────────────
    if (mode === "link") {
      const trimmed = link.trim();
      if (!trimmed) {
        setStatus("error");
        setError("Please paste your shareable link, or switch back to uploading a file.");
        return;
      }
      setStatus("submitting");
      setProgress(null);
      setError("");
      try {
        await postJson("/api/submit/link", {
          company,
          name,
          email,
          assignment,
          note,
          link: trimmed,
        });
        setStatus("success");
        form.reset();
        setLink("");
        setOversize(null);
        onSuccess?.();
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not submit your link.");
      }
      return;
    }

    // ── File submission ──────────────────────────────────────────────────────
    const file = fd.get("file");
    const isFile =
      !!file && typeof file === "object" && "size" in file && "name" in file;
    if (!isFile || (file as File).size === 0) {
      setStatus("error");
      setError("Please attach your file.");
      return;
    }
    const upload = file as File;
    if (upload.size > MAX_BYTES) {
      setOversize({ name: upload.name, mb: Math.ceil(upload.size / (1024 * 1024)) });
      setMode("link");
      setStatus("idle");
      return;
    }

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

  const submitting = status === "submitting";

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

      {mode === "file" ? (
        <div>
          <label htmlFor="a-file" className={labelClass}>
            File{" "}
            <span className="font-normal text-neutral-400">
              (PDF, Word, or video — MP4/MOV/WEBM)
            </span>
          </label>
          <input
            id="a-file"
            name="file"
            type="file"
            required
            onChange={onFileChange}
            accept=".pdf,.doc,.docx,.mp4,.mov,.webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/quicktime,video/webm"
            className="mt-1 block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-cardinal file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cardinal-dark"
          />
          <button
            type="button"
            onClick={() => {
              setMode("link");
              setError("");
            }}
            className="mt-2 text-xs font-semibold text-cardinal underline hover:text-cardinal-dark"
          >
            Video over 500 MB? Submit a shareable link instead
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
          {oversize ? (
            <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <strong>{oversize.name}</strong> is {oversize.mb}&nbsp;MB — over the{" "}
              {MAX_MB}&nbsp;MB limit. Upload it to your Google Drive and paste a
              shareable link below.
            </p>
          ) : (
            <p className="mb-3 text-sm text-neutral-600">
              Too big to upload? Share your video from Google Drive instead.
            </p>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            How to make it shareable
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-neutral-700">
            <li>Upload your video to Google Drive.</li>
            <li>
              Right-click the file and choose <strong>Share</strong>.
            </li>
            <li>
              Under <strong>General access</strong>, change{" "}
              <strong>Restricted</strong> to <strong>Anyone with the link</strong>.
            </li>
            <li>
              Keep the role as <strong>Viewer</strong>, then click{" "}
              <strong>Copy link</strong>.
            </li>
            <li>Paste the link below and submit.</li>
          </ol>
          <div className="mt-3">
            <label htmlFor="a-link" className={labelClass}>
              Shareable link
            </label>
            <input
              id="a-link"
              name="link"
              type="url"
              inputMode="url"
              placeholder="https://drive.google.com/…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setMode("file");
              setOversize(null);
              setError("");
            }}
            className="mt-2 text-xs font-semibold text-cardinal underline hover:text-cardinal-dark"
          >
            ← Upload a file instead
          </button>
        </div>
      )}

      <div>
        <label htmlFor="a-note" className={labelClass}>
          Note <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <textarea id="a-note" name="note" rows={3} className={inputClass} />
      </div>

      {submitting && progress !== null ? (
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
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-cardinal px-4 py-2 text-sm font-semibold text-white transition hover:bg-cardinal-dark disabled:opacity-60"
        >
          {submitting
            ? mode === "link"
              ? "Submitting…"
              : "Uploading…"
            : mode === "link"
              ? "Submit link"
              : "Submit assignment"}
        </button>
        <p className="mt-2 text-xs text-neutral-400">
          Maximum upload size is {MAX_MB}&nbsp;MB. For larger videos, submit a
          shareable Google Drive link.
        </p>
      </div>
    </form>
  );
}
