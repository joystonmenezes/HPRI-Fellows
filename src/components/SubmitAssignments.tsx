"use client";

import { useEffect, useRef, useState } from "react";
import { AssignmentForm } from "./AssignmentForm";
import { tableTh, tableTd } from "./ui";
import { formatWallTime, type SubmitState } from "@/lib/datetime";

type Row = {
  assignment: string;
  due: string;
  state: SubmitState;
  opensAt?: string;
  closesAt?: string;
};

const closedLabel: Record<Exclude<SubmitState, "open">, string> = {
  upcoming: "Not open yet",
  closed: "Closed",
  inactive: "Not yet active",
};

function windowHint(r: Row): string {
  if (r.state === "upcoming" && r.opensAt) return `Opens ${formatWallTime(r.opensAt)}`;
  if (r.state === "closed" && r.closesAt) return `Closed ${formatWallTime(r.closesAt)}`;
  return "";
}

export function SubmitAssignments({ rows }: { rows: Row[] }) {
  // `open` holds the assignment name the modal is submitting for, or null.
  const [open, setOpen] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The dropdown only offers assignments that are open for submission right now.
  const names = rows.filter((r) => r.state === "open").map((r) => r.assignment);

  useEffect(() => {
    if (open === null) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [open]);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <caption className="sr-only">Assignments and due dates</caption>
          <thead>
            <tr>
              <th scope="col" className={tableTh}>
                Assignment
              </th>
              <th scope="col" className={tableTh}>
                Due Date
              </th>
              <th scope="col" className={tableTh}>
                Submit
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={i} className={i % 2 ? "bg-neutral-50/60" : ""}>
                <td className={`${tableTd} font-medium text-neutral-900`}>
                  {a.assignment}
                </td>
                <td className={`${tableTd} whitespace-nowrap`}>{a.due}</td>
                <td className={tableTd}>
                  {a.state === "open" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpen(a.assignment)}
                        className="inline-flex items-center rounded bg-cardinal px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cardinal-dark"
                      >
                        Submit here
                      </button>
                      {a.closesAt ? (
                        <p className="mt-1 text-xs text-neutral-500">
                          Open until {formatWallTime(a.closesAt)}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled
                        title={windowHint(a) || "Submissions are not open"}
                        className="inline-flex cursor-not-allowed items-center rounded bg-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-500"
                      >
                        {closedLabel[a.state]}
                      </button>
                      {windowHint(a) ? (
                        <p className="mt-1 text-xs text-neutral-400">{windowHint(a)}</p>
                      ) : null}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal opened from a row's "Submit here" button. */}
      {open !== null ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-modal-title"
            className="animate-fade-up relative w-full max-w-xl rounded-xl bg-white p-6 shadow-xl sm:p-7"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
            >
              &times;
            </button>
            <h3
              id="submit-modal-title"
              className="font-serif text-xl font-bold text-cardinal"
            >
              Upload your assignment
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Submitting for <strong className="text-neutral-900">{open}</strong>
              . PDF or Word, max 20&nbsp;MB. You and the program staff each get an
              email confirmation. You can resubmit before the deadline.
            </p>
            <div className="mt-5">
              <AssignmentForm
                key={open}
                assignments={names}
                defaultAssignment={open}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
