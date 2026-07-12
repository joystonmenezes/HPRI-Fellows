"use client";

import { useState } from "react";
import { DeleteSubmissionButton } from "./DeleteSubmissionButton";

export type SubmissionItem = {
  id: number;
  name: string;
  email: string;
  subject?: string;
  message?: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  link?: string;
  createdAt: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmissionsList({ submissions }: { submissions: SubmissionItem[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="mt-3 space-y-2">
      {submissions.map((s) => {
        const isOpen = openId === s.id;
        const fileName = s.filePath?.replace(/^uploads\//, "");
        return (
          <div
            key={s.id}
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
          >
            <button
              type="button"
              onClick={() => setOpen(s.id, isOpen, setOpenId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-50"
            >
              <span className="w-40 shrink-0 text-xs text-neutral-400">
                {fmtDate(s.createdAt)}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-neutral-900">
                {s.name}
              </span>
              <span className="hidden min-w-0 flex-[2] truncate text-sm text-neutral-600 sm:block">
                {s.subject || "—"}
              </span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isOpen && (
              <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Name
                    </dt>
                    <dd className="mt-0.5 text-neutral-800">{s.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Email
                    </dt>
                    <dd className="mt-0.5">
                      <a href={`mailto:${s.email}`} className="text-cardinal underline">
                        {s.email}
                      </a>
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Assignment
                    </dt>
                    <dd className="mt-0.5 text-neutral-800">{s.subject || "—"}</dd>
                  </div>
                  {s.message && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Note
                      </dt>
                      <dd className="mt-0.5 text-neutral-700">{s.message}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {fileName ? (
                    <a
                      href={`/admin/files/${encodeURIComponent(fileName)}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-cardinal px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cardinal-dark"
                    >
                      ↓ Download file
                      {s.fileSize ? (
                        <span className="font-normal opacity-80">
                          ({fmtSize(s.fileSize)})
                        </span>
                      ) : null}
                    </a>
                  ) : s.link ? (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-cardinal px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cardinal-dark"
                    >
                      Open shared link ↗
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400">No file attached</span>
                  )}
                  <DeleteSubmissionButton id={s.id} what="submission" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function setOpen(
  id: number,
  isOpen: boolean,
  setter: (v: number | null) => void,
) {
  setter(isOpen ? null : id);
}
