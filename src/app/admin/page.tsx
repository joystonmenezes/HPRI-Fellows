import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listSubmissions, type Submission } from "@/lib/store";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { DeleteSubmissionButton } from "@/components/admin/DeleteSubmissionButton";

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

  const all = (await listSubmissions()).slice().reverse(); // newest first
  const contacts = all.filter((s) => s.kind === "contact");
  const assignments = all.filter((s) => s.kind === "assignment");

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-cardinal">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              HPRI Summer Fellows
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
