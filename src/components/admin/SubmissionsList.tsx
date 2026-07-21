"use client";

import { useState } from "react";
import { DeleteSubmissionButton } from "./DeleteSubmissionButton";
import { GradingControls } from "./GradingControls";

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
  graded?: boolean;
  gradedBy?: string;
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

// Partition submissions into one group per assignment type (the "subject"),
// keeping the incoming order both between groups (by first appearance) and
// within each group — so the existing submission order is never reshuffled.
// Any new assignment type automatically forms its own group the first time it
// appears, which is how a newly-opened assignment shows up here.
function groupBySubject(items: SubmissionItem[]) {
  const groups = new Map<string, SubmissionItem[]>();
  for (const s of items) {
    const key = s.subject?.trim() || "Other";
    const bucket = groups.get(key);
    if (bucket) bucket.push(s);
    else groups.set(key, [s]);
  }
  return Array.from(groups, ([subject, list]) => ({ subject, list }));
}

export function SubmissionsList({
  submissions,
}: {
  submissions: SubmissionItem[];
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  // Live graded flags, seeded from the server data. GradingControls updates this
  // as boxes are ticked so each group's "X/Y graded" tally stays current without
  // a full-page refresh (which would collapse any open sections).
  const [gradedMap, setGradedMap] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(submissions.map((s) => [s.id, !!s.graded])),
  );
  const groups = groupBySubject(submissions);

  return (
    <div className="mt-3 space-y-3">
      {groups.map((group) => {
        const gradedCount = group.list.filter((s) => gradedMap[s.id]).length;
        return (
          <details
            key={group.subject}
            open
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white [&[open]_.grp-chevron]:rotate-180"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-neutral-50 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="grp-chevron h-4 w-4 shrink-0 text-cardinal transition-transform duration-200"
                >
                  <path
                    d="M5 7.5l5 5 5-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="truncate font-serif font-bold text-cardinal">
                  {group.subject}
                </span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-xs text-neutral-500">
                {gradedCount}/{group.list.length} graded
              </span>
            </summary>

            <div className="divide-y divide-neutral-100 border-t border-neutral-200">
              {group.list.map((s) => {
                const isOpen = openId === s.id;
                const fileName = s.filePath?.replace(/^uploads\//, "");
                return (
                  <div key={s.id} className="bg-white">
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : s.id)}
                        className="group flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="w-36 shrink-0 text-xs text-neutral-400">
                          {fmtDate(s.createdAt)}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-neutral-900 group-hover:text-cardinal">
                          {s.name}
                        </span>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        >
                          <path
                            d="M5 7.5l5 5 5-5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <GradingControls
                        id={s.id}
                        graded={s.graded}
                        gradedBy={s.gradedBy}
                        onGradedChange={(g) =>
                          setGradedMap((m) => ({ ...m, [s.id]: g }))
                        }
                      />
                    </div>

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
                              <a
                                href={`mailto:${s.email}`}
                                className="text-cardinal underline"
                              >
                                {s.email}
                              </a>
                            </dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                              Assignment
                            </dt>
                            <dd className="mt-0.5 text-neutral-800">
                              {s.subject || "—"}
                            </dd>
                          </div>
                          {s.message && (
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                Note
                              </dt>
                              <dd className="mt-0.5 text-neutral-700">
                                {s.message}
                              </dd>
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
                            <span className="text-xs text-neutral-400">
                              No file attached
                            </span>
                          )}
                          <DeleteSubmissionButton id={s.id} what="submission" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
