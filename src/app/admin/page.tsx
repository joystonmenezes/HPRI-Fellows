import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  listSubmissions,
  listDeletedSubmissions,
  type Submission,
} from "@/lib/store";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { DeleteSubmissionButton } from "@/components/admin/DeleteSubmissionButton";
import { RestoreSubmissionButton } from "@/components/admin/RestoreSubmissionButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const th = "border-b border-neutral-200 px-3 py-2 text-left font-semibold text-neutral-700";
const td = "border-b border-neutral-100 px-3 py-2 align-top";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminDashboard() {
  const session = getSession();
  if (!session) redirect("/admin/login");

  const [active, deleted] = await Promise.all([
    listSubmissions(),
    listDeletedSubmissions(),
  ]);
  const all = active.slice().reverse(); // newest first
  const contacts = all.filter((s) => s.kind === "contact");
  const assignments = all.filter((s) => s.kind === "assignment");

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-cardinal">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              HPRI Summer Fellowship
            </p>
            <h1 className="font-serif text-2xl font-bold text-white">
              Admin dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/content"
              className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Edit content
            </a>
            <a
              href="/api/admin/export"
              className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-cardinal-dark transition hover:bg-gold-dark"
            >
              Export CSV
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-bold text-cardinal">
              Assignment submissions
            </h2>
            <span className="text-sm text-neutral-500">
              {assignments.length} total
            </span>
          </div>
          {assignments.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">No submissions yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className={th}>Received</th>
                    <th className={th}>Name</th>
                    <th className={th}>Email</th>
                    <th className={th}>Assignment</th>
                    <th className={th}>File</th>
                    <th className={th}>Note</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((s) => (
                    <tr key={s.id}>
                      <td className={`${td} whitespace-nowrap text-neutral-600`}>
                        {fmtDate(s.createdAt)}
                      </td>
                      <td className={`${td} font-medium text-neutral-900`}>
                        {s.name}
                      </td>
                      <td className={td}>
                        <a
                          href={`mailto:${s.email}`}
                          className="text-cardinal underline"
                        >
                          {s.email}
                        </a>
                      </td>
                      <td className={td}>{s.subject}</td>
                      <td className={td}>{fileCell(s)}</td>
                      <td className={`${td} max-w-xs text-neutral-700`}>
                        {s.message || (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <DeleteSubmissionButton id={s.id} what="submission" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-bold text-cardinal">
              Contact messages
            </h2>
            <span className="text-sm text-neutral-500">
              {contacts.length} total
            </span>
          </div>
          {contacts.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">No messages yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className={th}>Received</th>
                    <th className={th}>Name</th>
                    <th className={th}>Email</th>
                    <th className={th}>Subject</th>
                    <th className={th}>Message</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((s) => (
                    <tr key={s.id}>
                      <td className={`${td} whitespace-nowrap text-neutral-600`}>
                        {fmtDate(s.createdAt)}
                      </td>
                      <td className={`${td} font-medium text-neutral-900`}>
                        {s.name}
                      </td>
                      <td className={td}>
                        <a
                          href={`mailto:${s.email}`}
                          className="text-cardinal underline"
                        >
                          {s.email}
                        </a>
                      </td>
                      <td className={td}>
                        {s.subject || <span className="text-neutral-400">—</span>}
                      </td>
                      <td className={`${td} max-w-md whitespace-pre-wrap text-neutral-700`}>
                        {s.message}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <DeleteSubmissionButton id={s.id} what="message" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <details className="[&[open]_.rd-chevron]:rotate-180">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
              <h2 className="font-serif text-xl font-bold text-cardinal">
                Recently deleted
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-500">
                  {deleted.length} item{deleted.length === 1 ? "" : "s"}
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="rd-chevron h-5 w-5 shrink-0 text-cardinal transition-transform duration-200"
                >
                  <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </summary>
            <div className="border-t border-neutral-200 p-5 pt-4">
          <p className="text-sm text-neutral-500">
            Deleted submissions and messages are kept here so you can restore
            them. Use Delete permanently to remove an item for good — this also
            deletes any uploaded file and cannot be undone.
          </p>
          {deleted.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">
              Nothing here. Deleted items will appear in this list.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className={th}>Deleted</th>
                    <th className={th}>Type</th>
                    <th className={th}>Name</th>
                    <th className={th}>Email</th>
                    <th className={th}>Subject / Assignment</th>
                    <th className={th}>File</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deleted.map((s) => (
                    <tr key={s.id}>
                      <td className={`${td} whitespace-nowrap text-neutral-600`}>
                        {s.deletedAt ? fmtDate(s.deletedAt) : "—"}
                      </td>
                      <td className={td}>
                        {s.kind === "assignment" ? "Submission" : "Message"}
                      </td>
                      <td className={`${td} font-medium text-neutral-900`}>
                        {s.name}
                      </td>
                      <td className={td}>
                        <a
                          href={`mailto:${s.email}`}
                          className="text-cardinal underline"
                        >
                          {s.email}
                        </a>
                      </td>
                      <td className={td}>
                        {s.subject || (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className={td}>{fileCell(s)}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-2">
                          <RestoreSubmissionButton id={s.id} />
                          <DeleteSubmissionButton
                            id={s.id}
                            what={
                              s.kind === "assignment" ? "submission" : "message"
                            }
                            mode="purge"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}

function fileCell(s: Submission) {
  if (!s.filePath) return <span className="text-neutral-400">—</span>;
  const name = s.filePath.replace(/^uploads\//, "");
  return (
    <a
      href={`/admin/files/${encodeURIComponent(name)}`}
      className="font-medium text-cardinal underline"
    >
      {s.fileName || "Download"}
      {s.fileSize ? (
        <span className="ml-1 text-neutral-400">({fmtSize(s.fileSize)})</span>
      ) : null}
    </a>
  );
}
