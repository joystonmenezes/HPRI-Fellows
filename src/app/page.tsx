import { Fragment, type ReactNode } from "react";
import { program } from "@/content/program";
import { getContent, submissionState } from "@/lib/content";
import { type SectionKey, SECTION_NAV_LABELS } from "@/content/sections";
import { SiteHeader } from "@/components/SiteHeader";
import { HeroBanner } from "@/components/HeroBanner";
import { SectionNav } from "@/components/SectionNav";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Section,
  ActionLink,
  MaterialLinks,
  tableTh,
  tableTd,
} from "@/components/ui";
import { ContactForm } from "@/components/ContactForm";
import { SubmitAssignments } from "@/components/SubmitAssignments";

// Read editable content (hero text, quick links, announcements) at request time
// so admin edits appear immediately without a rebuild.
export const dynamic = "force-dynamic";

function formatAnnouncementDate(value: string): string {
  // Parse a plain yyyy-mm-dd as a local calendar date so the displayed day
  // doesn't shift by one in timezones behind UTC.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function Home() {
  const content = await getContent();
  const {
    glance,
    presentations,
    rules,
    mentors,
    activities,
    assignments,
    capstone,
    recommendedReadings,
    contacts,
    citi,
  } = content;
  const announcements = content.announcements.filter((a) => a.published);
  // Only show items the admin has left published (default is shown).
  const quickLinks = content.quickLinks.filter((l) => l.published !== false);
  const schedule = presentations.schedule.filter((s) => s.published !== false);
  const publishedReadings = recommendedReadings.rows.filter(
    (r) => r.published !== false,
  );
  const mentorRows = mentors.rows.filter((m) => m.published !== false);
  const activityRows = activities.rows.filter((a) => a.published !== false);
  const assignmentRows = assignments.rows
    .filter((a) => a.published !== false)
    .map((a) => ({
      assignment: a.assignment,
      due: a.due,
      state: submissionState(a),
      opensAt: a.opensAt ?? "",
      closesAt: a.closesAt ?? "",
      materialHref: a.materialHref ?? "",
    }));
  const contactRows = contacts.rows.filter((c) => c.published !== false);
  // CITI Training: split the body into paragraphs on blank lines; show only the
  // links the admin has left published.
  const citiParagraphs = citi.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const citiLinks = citi.links.filter((l) => l.published !== false);

  // Sections the admin has left visible, in the admin-chosen order.
  const visibleSections = content.sections.filter((s) => s.published);
  const contactsVisible = visibleSections.some((s) => s.key === "contacts");
  // The floating nav mirrors the admin-chosen layout order + visibility, with
  // News at the start (only when there are announcements) and Contact Us at the
  // end (only when the Contacts section, which holds the form, is visible).
  const navItems: { label: string; href: string }[] = [
    ...(announcements.length > 0
      ? [{ label: "News", href: "#news" }]
      : []),
    ...visibleSections
      .map((s) => {
        const label = SECTION_NAV_LABELS[s.key];
        return label ? { label, href: `#${s.key}` } : null;
      })
      .filter((x): x is { label: string; href: string } => x !== null),
    ...(contactsVisible
      ? [{ label: "Contact Us", href: "#contact" }]
      : []),
  ];

  // Each main section's markup, keyed so the page can render them in any order.
  const sectionViews: Record<SectionKey, ReactNode> = {
    materials: (
      <Section
        id="materials"
        title="Fellowship Documents"
        intro="External references and key program links. Items marked “soon” are activated as documents and links are uploaded."
      >
        <div className="flex flex-wrap justify-center gap-3">
          {quickLinks.map((l) => (
            <ActionLink key={l.label} link={l} variant="outline" />
          ))}
        </div>
      </Section>
    ),
    glance: (
      <Section id="glance" title="Program at a Glance">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Program at a glance</caption>
            <tbody>
              {glance.rows.map((r) => (
                <tr key={r.label}>
                  <th
                    scope="row"
                    className={`${tableTd} w-56 text-left font-semibold text-cardinal`}
                  >
                    {r.label}
                  </th>
                  <td className={tableTd}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 rounded-md bg-gold/15 p-4 text-sm leading-relaxed text-neutral-700">
          {glance.note}
        </p>
      </Section>
    ),
    presentations: (
      <Section
        id="presentations"
        title="Presentations & Gatherings : Seminars and Tuesday Talks"
        intro={presentations.intro}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <caption className="sr-only">
              Seminar and Tuesday Talk schedule
            </caption>
            <thead>
              <tr>
                <th scope="col" className={tableTh}>
                  Week
                </th>
                <th scope="col" className={tableTh}>
                  Date / Time
                </th>
                <th scope="col" className={tableTh}>
                  Type
                </th>
                <th scope="col" className={tableTh}>
                  Topic / Presenter
                </th>
                <th scope="col" className={tableTh}>
                  Location / Format
                </th>
                <th scope="col" className={tableTh}>
                  Materials
                </th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((s, i) => (
                <tr key={i} className={i % 2 ? "bg-neutral-50/60" : ""}>
                  <td className={`${tableTd} whitespace-nowrap font-semibold`}>
                    {s.week}
                  </td>
                  <td className={`${tableTd} whitespace-nowrap`}>{s.when}</td>
                  <td className={tableTd}>{s.type}</td>
                  <td className={`${tableTd} min-w-[220px]`}>{s.topic}</td>
                  <td className={`${tableTd} min-w-[200px] text-neutral-600`}>
                    {s.location}
                  </td>
                  <td className={tableTd}>
                    <MaterialLinks items={s.materials} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 rounded-md border-l-4 border-cardinal bg-cardinal/5 p-4 text-sm text-neutral-700">
          {presentations.missedNote}
        </p>
      </Section>
    ),
    citi: (
      <Section id="citi" title="CITI Training">
        <div className="space-y-4 text-neutral-700 leading-relaxed">
          {citiParagraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {citiLinks.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {citiLinks.map((l) => (
              <ActionLink key={l.label} link={l} />
            ))}
          </div>
        ) : null}
      </Section>
    ),
    rules: (
      <Section id="rules" title="Rules and Expectations" intro={rules.intro}>
        <h3 className="font-semibold text-neutral-900">Key expectations</h3>
        <ul className="mt-3 space-y-2">
          {rules.expectations.map((e, i) => (
            <li key={i} className="flex gap-2 text-neutral-700">
              <span
                aria-hidden="true"
                className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold"
              />
              <span>{e}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <ActionLink link={rules.agreementLink} />
        </div>
      </Section>
    ),
    mentors: (
      <Section id="mentors" title="Mentors" intro={mentors.intro}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="sr-only">Fellows and mentors</caption>
            <thead>
              <tr>
                <th scope="col" className={tableTh}>
                  Fellow
                </th>
                <th scope="col" className={tableTh}>
                  Primary Mentor
                </th>
                <th scope="col" className={tableTh}>
                  Secondary Mentor
                </th>
                <th scope="col" className={tableTh}>
                  Project Area
                </th>
              </tr>
            </thead>
            <tbody>
              {mentorRows.map((m, i) => (
                <tr key={i} className={i % 2 ? "bg-neutral-50/60" : ""}>
                  <td className={tableTd}>{m.fellow}</td>
                  <td className={tableTd}>{m.primary}</td>
                  <td className={tableTd}>{m.secondary}</td>
                  <td className={tableTd}>{m.area}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5">
          <ActionLink link={mentors.link} variant="outline" />
        </div>
      </Section>
    ),
    activities: (
      <Section
        id="activities"
        title="Self-Directed Activity Options"
        intro={activities.intro}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="sr-only">Self-directed activity options</caption>
            <thead>
              <tr>
                <th scope="col" className={tableTh}>
                  Activity
                </th>
                <th scope="col" className={tableTh}>
                  Summary
                </th>
                <th scope="col" className={tableTh}>
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {activityRows.map((a, i) => (
                <tr key={i} className={i % 2 ? "bg-neutral-50/60" : ""}>
                  <td className={`${tableTd} font-medium text-neutral-900`}>
                    {a.activity}
                  </td>
                  <td className={tableTd}>{a.deliverable}</td>
                  <td className={tableTd}>
                    {a.detailsHref ? (
                      <a
                        href={a.detailsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center whitespace-nowrap rounded border border-cardinal px-3 py-1.5 text-xs font-semibold text-cardinal transition hover:bg-cardinal/5"
                      >
                        More Details ↗
                      </a>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <ActionLink link={activities.link} variant="outline" />
          <ActionLink link={activities.trackerLink} variant="outline" />
        </div>
      </Section>
    ),
    submit: (
      <Section id="submit" title="Submit Assignments" intro={assignments.intro}>
        <SubmitAssignments rows={assignmentRows} />
      </Section>
    ),
    capstone: (
      <Section id="capstone" title="Capstone Project" intro={capstone.intro}>
        <h3 className="font-semibold text-neutral-900">
          Recommended slide flow
        </h3>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {capstone.slideFlow.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-md border border-neutral-200 p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cardinal text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-neutral-700">{s}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5">
          <ActionLink link={capstone.guideLink} />
        </div>
      </Section>
    ),
    readings: (
      <Section
        id="readings"
        title="Recommended Readings"
        intro={recommendedReadings.intro}
      >
        {publishedReadings.length ? (
          <ul className="space-y-2">
            {publishedReadings.map((r, i) => (
              <li key={i} className="flex gap-2 text-neutral-700">
                <span aria-hidden="true" className="text-cardinal">
                  →
                </span>
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-cardinal underline hover:text-cardinal-dark"
                  >
                    {r.title}
                  </a>
                ) : (
                  <span>{r.title}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            Recommended readings will be posted here soon.
          </p>
        )}
      </Section>
    ),
    contacts: (
      <Section id="contacts" title="Important Contacts and Addresses">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">Important contacts</caption>
            <thead>
              <tr>
                <th scope="col" className={tableTh}>
                  Need
                </th>
                <th scope="col" className={tableTh}>
                  Contact
                </th>
                <th scope="col" className={tableTh}>
                  Use For
                </th>
              </tr>
            </thead>
            <tbody>
              {contactRows.map((c, i) => (
                <tr key={i} className={i % 2 ? "bg-neutral-50/60" : ""}>
                  <td className={`${tableTd} font-medium text-neutral-900`}>
                    {c.need}
                  </td>
                  <td className={tableTd}>
                    {c.contact ? <span>{c.contact}</span> : null}
                    {c.email ? (
                      <span className="mt-1 block">
                        <a
                          href={`mailto:${c.email}`}
                          className="text-cardinal underline underline-offset-2 hover:text-cardinal-dark"
                        >
                          {c.email}
                        </a>
                      </span>
                    ) : null}
                    {c.phone ? (
                      <span className="mt-0.5 block">
                        <a
                          href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                          className="text-cardinal underline underline-offset-2 hover:text-cardinal-dark"
                        >
                          {c.phone}
                        </a>
                      </span>
                    ) : null}
                  </td>
                  <td className={tableTd}>{c.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {contacts.locations.map((loc) => (
            <div
              key={loc.name}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-4"
            >
              <p className="font-semibold text-cardinal">{loc.name}</p>
              {loc.lines.map((l) => (
                <p key={l} className="text-sm text-neutral-700">
                  {l}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div id="contact" className="mt-8 scroll-mt-28 border-t border-neutral-200 pt-6">
          <h3 className="font-serif text-xl font-bold text-cardinal">
            Send us a message
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            Questions about the program? Use the form below — we reply by email,
            and you’ll get a copy of your message.
          </p>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>
      </Section>
    ),
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-cardinal focus:shadow-lg"
      >
        Skip to main content
      </a>

      <SiteHeader />
      <ScrollReveal />

      {/* Hero banner */}
      <section id="top" className="relative isolate overflow-hidden">
        {/* Background: cardinal gradient base (shows even if a photo is missing),
            then the admin-chosen banner photo(s) — a slideshow when there are
            several — with a cardinal overlay so the white title stays readable. */}
        <HeroBanner images={content.bannerImages} seconds={content.bannerSeconds} />

        <div className="mx-auto max-w-content px-4 py-20 sm:py-28">
          <div className="max-w-3xl">
            <p
              className="animate-fade-up text-sm font-semibold uppercase tracking-[0.22em] text-gold"
              style={{ animationDelay: "0.05s" }}
            >
              {content.term}
            </p>
            <h1
              className="animate-fade-up mt-3 font-serif text-4xl font-bold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-6xl"
              style={{ animationDelay: "0.15s" }}
            >
              {program.name}
            </h1>
            <div
              className="animate-fade-up mt-5 h-1 w-24 rounded bg-gold"
              style={{ animationDelay: "0.25s" }}
              aria-hidden="true"
            />
            <p
              className="animate-fade-up mt-5 text-xl font-semibold text-gold-light sm:text-2xl"
              style={{ animationDelay: "0.3s" }}
            >
              {content.dateRange}
            </p>
            <p
              className="animate-fade-up mt-2 text-lg text-white/90"
              style={{ animationDelay: "0.4s" }}
            >
              {content.tagline}
            </p>
            <p
              className="animate-fade-up mt-6 max-w-2xl leading-relaxed text-white/85"
              style={{ animationDelay: "0.5s" }}
            >
              {content.intro}
            </p>
          </div>
        </div>
      </section>

      <SectionNav items={navItems} />

      {/* News & Announcements */}
      {announcements.length > 0 ? (
        <section
          id="news"
          className="reveal scroll-mt-28 border-b border-neutral-200 bg-gold/10"
        >
          <div className="mx-auto max-w-content px-4 py-8">
            <h2 className="font-serif text-2xl font-bold text-cardinal">
              News &amp; Announcements
            </h2>
            <ul className="mt-4 space-y-4">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-neutral-900">{a.title}</h3>
                    {a.date ? (
                      <span className="text-sm text-neutral-500">
                        {formatAnnouncementDate(a.date)}
                      </span>
                    ) : null}
                  </div>
                  {a.body ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                      {a.body}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <main id="main" className="mx-auto max-w-content space-y-8 px-4 py-10">
        {visibleSections.map((s) => (
          <Fragment key={s.key}>{sectionViews[s.key]}</Fragment>
        ))}
      </main>

      <SiteFooter />
    </>
  );
}
