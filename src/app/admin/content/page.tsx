import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { getContent } from "@/lib/content";
import { type SectionKey } from "@/content/sections";
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
  RecommendedReadingsEditor,
  ContactsEditor,
  CitiEditor,
} from "@/components/admin/ContentEditors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  if (!getSession()) redirect("/admin/login");
  const c = await getContent();

  // Each reorderable content section's editor, keyed by section key, with its
  // anchor id and the "Jump to" label. The cards below — and the jump links —
  // are rendered in the admin-chosen Page-layout order (c.sections), so saving a
  // new layout reorders them to match.
  const sectionEditors: Record<
    SectionKey,
    { anchor: string; nav: string; node: ReactNode }
  > = {
    materials: {
      anchor: "links",
      nav: "Fellowship Documents",
      node: <QuickLinksEditor initial={c.quickLinks} />,
    },
    glance: {
      anchor: "glance",
      nav: "At a glance",
      node: <GlanceEditor initial={c.glance} />,
    },
    presentations: {
      anchor: "presentations",
      nav: "Presentations",
      node: <PresentationsEditor initial={c.presentations} />,
    },
    citi: {
      anchor: "citi",
      nav: "CITI Training",
      node: <CitiEditor initial={c.citi} />,
    },
    rules: {
      anchor: "rules",
      nav: "Rules",
      node: <RulesEditor initial={c.rules} />,
    },
    mentors: {
      anchor: "mentors",
      nav: "Mentors",
      node: <MentorsEditor initial={c.mentors} />,
    },
    activities: {
      anchor: "activities",
      nav: "Activities",
      node: <ActivitiesEditor initial={c.activities} />,
    },
    submit: {
      anchor: "assignments",
      nav: "Assignments",
      node: <AssignmentsEditor initial={c.assignments} />,
    },
    capstone: {
      anchor: "capstone",
      nav: "Capstone",
      node: <CapstoneEditor initial={c.capstone} />,
    },
    readings: {
      anchor: "readings",
      nav: "Readings",
      node: <RecommendedReadingsEditor initial={c.recommendedReadings} />,
    },
    contacts: {
      anchor: "contacts",
      nav: "Contacts",
      node: <ContactsEditor initial={c.contacts} />,
    },
  };

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
              ...c.sections.map(
                (s) =>
                  [
                    sectionEditors[s.key].anchor,
                    sectionEditors[s.key].nav,
                  ] as [string, string],
              ),
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
        {c.sections.map((s) => (
          <section
            key={s.key}
            id={`edit-${sectionEditors[s.key].anchor}`}
            className="scroll-mt-4"
          >
            {sectionEditors[s.key].node}
          </section>
        ))}
        </AccordionProvider>
      </main>
    </div>
  );
}
