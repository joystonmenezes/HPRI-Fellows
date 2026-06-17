import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getContent } from "@/lib/content";
import {
  AccordionProvider,
  SectionsEditor,
  BannerEditor,
  BasicsEditor,
  QuickLinksEditor,
  AnnouncementsEditor,
  GlanceEditor,
  PresentationsEditor,
  RulesEditor,
  MentorsEditor,
  ActivitiesEditor,
  AssignmentsEditor,
  CapstoneEditor,
  ContactsEditor,
  CitiEditor,
} from "@/components/admin/ContentEditors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  if (!getSession()) redirect("/admin/login");
  const c = await getContent();

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-cardinal">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold">
              HPRI Summer Fellowship
            </p>
            <h1 className="font-serif text-2xl font-bold text-white">
              Edit site content
            </h1>
          </div>
          <a
            href="/admin"
            className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            ← Submissions
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <p className="text-sm text-neutral-600">
          Every section below is live. Each card has its own “Save changes”
          button — edits save immediately and appear on the public site right
          away.{" "}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-cardinal underline"
          >
            View site ↗
          </a>
        </p>

        <nav
          aria-label="Jump to section"
          className="rounded-lg border border-neutral-200 bg-white p-4 text-sm shadow-sm"
        >
          <span className="font-semibold text-neutral-700">Jump to: </span>
          <span className="text-cardinal">
            {[
              ["sections", "Page layout"],
              ["news", "News"],
              ["banner", "Banner"],
              ["basics", "Header & intro"],
              ["links", "Fellowship Documents"],
              ["glance", "At a glance"],
              ["presentations", "Presentations"],
              ["citi", "CITI Training"],
              ["rules", "Rules"],
              ["mentors", "Mentors"],
              ["activities", "Activities"],
              ["assignments", "Assignments"],
              ["capstone", "Capstone"],
              ["contacts", "Contacts"],
            ].map(([id, label], i) => (
              <span key={id}>
                {i > 0 ? <span className="text-neutral-300"> · </span> : null}
                <a href={`#edit-${id}`} className="hover:underline">
                  {label}
                </a>
              </span>
            ))}
          </span>
        </nav>

        <AccordionProvider defaultOpenIds={[]}>
        <section id="edit-sections" className="scroll-mt-4">
          <SectionsEditor initial={c.sections} />
        </section>
        <section id="edit-news" className="scroll-mt-4">
          <AnnouncementsEditor initial={c.announcements} />
        </section>
        <section id="edit-banner" className="scroll-mt-4">
          <BannerEditor initial={c.bannerImages} seconds={c.bannerSeconds} />
        </section>
        <section id="edit-basics" className="scroll-mt-4">
          <BasicsEditor
            initial={{
              term: c.term,
              dateRange: c.dateRange,
              tagline: c.tagline,
              intro: c.intro,
            }}
          />
        </section>
        <section id="edit-links" className="scroll-mt-4">
          <QuickLinksEditor initial={c.quickLinks} />
        </section>
        <section id="edit-glance" className="scroll-mt-4">
          <GlanceEditor initial={c.glance} />
        </section>
        <section id="edit-presentations" className="scroll-mt-4">
          <PresentationsEditor initial={c.presentations} />
        </section>
        <section id="edit-citi" className="scroll-mt-4">
          <CitiEditor initial={c.citi} />
        </section>
        <section id="edit-rules" className="scroll-mt-4">
          <RulesEditor initial={c.rules} />
        </section>
        <section id="edit-mentors" className="scroll-mt-4">
          <MentorsEditor initial={c.mentors} />
        </section>
        <section id="edit-activities" className="scroll-mt-4">
          <ActivitiesEditor initial={c.activities} />
        </section>
        <section id="edit-assignments" className="scroll-mt-4">
          <AssignmentsEditor initial={c.assignments} />
        </section>
        <section id="edit-capstone" className="scroll-mt-4">
          <CapstoneEditor initial={c.capstone} />
        </section>
        <section id="edit-contacts" className="scroll-mt-4">
          <ContactsEditor initial={c.contacts} />
        </section>
        </AccordionProvider>
      </main>
    </div>
  );
}
