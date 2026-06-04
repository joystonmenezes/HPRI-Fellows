import fs from "node:fs";
import path from "node:path";
import {
  program,
  type Link,
  type ScheduleRow,
  type MentorRow,
  type ActivityRow,
  type AssignmentRow,
  type ContactRow,
} from "@/content/program";
import { getDb } from "@/lib/firebase";
import { type SubmitState } from "@/lib/datetime";
import {
  type SectionConfig,
  defaultSections,
  normalizeSections,
} from "@/content/sections";

// Runtime-editable site content for the WHOLE page. Defaults come from
// program.ts. Once an admin saves edits they are stored in Firestore
// (document site/content) and override the defaults. If Firebase is not
// configured we fall back to a local data/content.json file so the site still
// runs in development. The public page reads getContent() at request time, so
// edits appear without a redeploy.

export type Announcement = {
  id: number;
  title: string;
  body: string;
  date: string;
  published: boolean;
};

export type GlanceRow = { label: string; value: string };
export type LocationBlock = { name: string; lines: string[] };

export type SiteContent = {
  // Order + show/hide for the main content sections (drives the public page and
  // the floating nav). See src/content/sections.ts for the section registry.
  sections: SectionConfig[];
  // Hero / header
  term: string;
  dateRange: string;
  tagline: string;
  intro: string;
  // Hero banner photos. Empty → the bundled /banner.jpg is shown. One → a single
  // photo; several → a slideshow that fades between them every couple of seconds.
  bannerImages: string[];
  // Seconds each banner photo shows before fading to the next (slideshow speed).
  // Only matters with 2+ photos. Admin-editable; defaults to 2.
  bannerSeconds: number;
  quickLinks: Link[];
  announcements: Announcement[];
  // Program at a glance
  glance: { rows: GlanceRow[]; note: string };
  // Presentations
  presentations: { intro: string; missedNote: string; schedule: ScheduleRow[] };
  // Rules
  rules: { intro: string; expectations: string[]; agreementLink: Link };
  // Mentors
  mentors: { intro: string; rows: MentorRow[]; link: Link };
  // Activities
  activities: {
    intro: string;
    rows: ActivityRow[];
    link: Link;
    trackerLink: Link;
  };
  // Assignments
  assignments: { intro: string; rows: AssignmentRow[]; link: Link };
  // Capstone
  capstone: {
    intro: string;
    slideFlow: string[];
    guideLink: Link;
    published: boolean;
  };
  // Contacts
  contacts: { rows: ContactRow[]; locations: LocationBlock[] };
};

const dataDir = path.join(process.cwd(), "data");
const file = path.join(dataDir, "content.json");
const COLLECTION = "site";
const DOC = "content";

// ── Defaults (seed) ─────────────────────────────────────────────────────────

function link(l: Link): Link {
  return l.href ? { label: l.label, href: l.href } : { label: l.label };
}

export function defaultContent(): SiteContent {
  return {
    sections: defaultSections(),
    term: program.term,
    dateRange: program.dateRange,
    tagline: program.tagline,
    intro: program.intro,
    bannerImages: [],
    bannerSeconds: 2,
    quickLinks: program.quickLinks.map((l) => ({ ...link(l), published: true })),
    announcements: [],
    glance: {
      rows: program.glance.rows.map((r) => ({ label: r.label, value: r.value })),
      note: program.glance.note,
    },
    presentations: {
      intro: program.presentations.intro,
      missedNote: program.presentations.missedNote,
      schedule: program.presentations.schedule.map((s) => ({
        week: s.week,
        when: s.when,
        type: s.type,
        topic: s.topic,
        location: s.location,
        materials: s.materials.map(link),
        published: true,
      })),
    },
    rules: {
      intro: program.rules.intro,
      expectations: [...program.rules.expectations],
      agreementLink: link(program.rules.agreementLink),
    },
    mentors: {
      intro: program.mentors.intro,
      rows: program.mentors.rows.map((m) => ({ ...m, published: true })),
      link: link(program.mentors.link),
    },
    activities: {
      intro: program.activities.intro,
      rows: program.activities.rows.map((a) => ({ ...a, published: true })),
      link: link(program.activities.link),
      trackerLink: link(program.activities.trackerLink),
    },
    assignments: {
      intro: program.assignments.intro,
      rows: program.assignments.rows.map((a) => ({
        assignment: a.assignment,
        due: a.due,
        submit: link(a.submit),
        published: true,
        active: false,
        opensAt: "",
        closesAt: "",
      })),
      link: link(program.assignments.link),
    },
    capstone: {
      intro: program.capstone.intro,
      slideFlow: [...program.capstone.slideFlow],
      guideLink: link(program.capstone.guideLink),
      published: true,
    },
    contacts: {
      rows: program.contacts.rows.map((c) => ({ ...c, published: true })),
      locations: program.contacts.locations.map((l) => ({
        name: l.name,
        lines: [...l.lines],
      })),
    },
  };
}

// ── Sanitisers ──────────────────────────────────────────────────────────────

function clampStr(v: unknown, max: number): string {
  return (typeof v === "string" ? v : "").slice(0, max);
}

const has = (v: unknown): v is string => typeof v === "string";

// Publish flag: shown unless explicitly set to false (so existing data and new
// items default to visible).
const pub = (v: unknown): boolean => v !== false;

// Only allow safe link targets; anything else (e.g. javascript:) is dropped so
// the link renders as an inert "soon" placeholder rather than executing.
function safeHref(v: unknown): string | undefined {
  const href = clampStr(v, 500).trim();
  if (!href) return undefined;
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(href)) return href;
  return undefined;
}

function cleanLink(v: unknown): Link {
  const label = clampStr((v as { label?: unknown })?.label, 160).trim();
  const href = safeHref((v as { href?: unknown })?.href);
  return href ? { label, href } : { label };
}

function cleanLinks(v: unknown): Link[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const label = clampStr((x as { label?: unknown })?.label, 120).trim();
      const href = safeHref((x as { href?: unknown })?.href);
      return href ? { label, href } : { label };
    })
    .filter((l) => l.label.length > 0)
    .slice(0, 50);
}

// Banner photos: a list of safe image URLs — either an uploaded
// "/api/banner/…" path served by our own route, or an external http(s) link.
// Anything else (e.g. a javascript: URL) is dropped so the hero can't be
// pointed at an unsafe source.
function safeImageUrl(v: unknown): string | undefined {
  const url = clampStr(v, 1000).trim();
  if (!url) return undefined;
  return /^(https?:\/\/|\/)/i.test(url) ? url : undefined;
}

function cleanBannerImages(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(safeImageUrl)
    .filter((s): s is string => Boolean(s))
    .slice(0, 12);
}

// Slideshow speed in seconds. Clamped to a sane range so a stray value can't
// freeze the slideshow or flash it too fast. Defaults to 2 when missing/invalid.
function cleanBannerSeconds(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return 2;
  return Math.min(30, Math.max(1, Math.round(n * 10) / 10));
}

// Quick links carry a publish flag (unlike the "materials" links, which use
// cleanLinks above). Unchecked links are kept but hidden on the public page.
function cleanQuickLinks(v: unknown): Link[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const label = clampStr((x as { label?: unknown })?.label, 120).trim();
      const href = safeHref((x as { href?: unknown })?.href);
      const published = pub((x as { published?: unknown })?.published);
      return href ? { label, href, published } : { label, published };
    })
    .filter((l) => l.label.length > 0)
    .slice(0, 50);
}

function cleanStrList(v: unknown, max: number, itemMax: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => clampStr(x, itemMax).trim())
    .filter((s) => s.length > 0)
    .slice(0, max);
}

function cleanAnnouncements(v: unknown): Announcement[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 100)
    .map((x, i) => {
      const a = x as Partial<Announcement>;
      return {
        id: i + 1,
        title: clampStr(a?.title, 160).trim(),
        body: clampStr(a?.body, 4000).trim(),
        date: clampStr(a?.date, 40).trim(),
        published: Boolean(a?.published),
      };
    })
    .filter((a) => a.title.length > 0 || a.body.length > 0);
}

function cleanGlanceRows(v: unknown): GlanceRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => ({
      label: clampStr((x as { label?: unknown })?.label, 120).trim(),
      value: clampStr((x as { value?: unknown })?.value, 2000).trim(),
    }))
    .filter((r) => r.label.length > 0 || r.value.length > 0)
    .slice(0, 50);
}

function cleanSchedule(v: unknown): ScheduleRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const r = x as Partial<ScheduleRow>;
      return {
        week: clampStr(r.week, 40).trim(),
        when: clampStr(r.when, 120).trim(),
        type: clampStr(r.type, 80).trim(),
        topic: clampStr(r.topic, 600).trim(),
        location: clampStr(r.location, 600).trim(),
        materials: cleanLinks(r.materials),
        published: pub(r.published),
      };
    })
    .filter(
      (r) =>
        r.week || r.when || r.type || r.topic || r.location || r.materials.length,
    )
    .slice(0, 100);
}

function cleanMentors(v: unknown): MentorRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const r = x as Partial<MentorRow>;
      return {
        fellow: clampStr(r.fellow, 160).trim(),
        primary: clampStr(r.primary, 160).trim(),
        secondary: clampStr(r.secondary, 160).trim(),
        area: clampStr(r.area, 300).trim(),
        published: pub(r.published),
      };
    })
    .filter((r) => r.fellow || r.primary || r.secondary || r.area)
    .slice(0, 200);
}

function cleanActivities(v: unknown): ActivityRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const r = x as Partial<ActivityRow>;
      return {
        activity: clampStr(r.activity, 200).trim(),
        deliverable: clampStr(r.deliverable, 600).trim(),
        published: pub(r.published),
      };
    })
    .filter((r) => r.activity || r.deliverable)
    .slice(0, 200);
}

// Accepts a <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm", optionally
// with seconds) and normalises it to minute precision. Anything else → "".
function cleanDateTime(v: unknown): string {
  const s = clampStr(v, 19).trim();
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) ? s.slice(0, 16) : "";
}

function cleanAssignments(v: unknown): AssignmentRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const r = x as Partial<AssignmentRow>;
      const submit = cleanLink(r.submit ?? { label: "Submit here" });
      return {
        assignment: clampStr(r.assignment, 200).trim(),
        due: clampStr(r.due, 80).trim(),
        submit: submit.label ? submit : { label: "Submit here" },
        published: pub(r.published),
        // Closed by default: only an explicit true opens submissions.
        active: r.active === true,
        opensAt: cleanDateTime(r.opensAt),
        closesAt: cleanDateTime(r.closesAt),
      };
    })
    .filter((r) => r.assignment.length > 0)
    .slice(0, 200);
}

function cleanContacts(v: unknown): ContactRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const r = x as Partial<ContactRow>;
      return {
        need: clampStr(r.need, 200).trim(),
        contact: clampStr(r.contact, 400).trim(),
        use: clampStr(r.use, 600).trim(),
        email: clampStr(r.email, 200).trim(),
        phone: clampStr(r.phone, 60).trim(),
        published: pub(r.published),
      };
    })
    .filter((r) => r.need || r.contact || r.use || r.email || r.phone)
    .slice(0, 100);
}

function cleanLocations(v: unknown): LocationBlock[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const r = x as Partial<LocationBlock>;
      return {
        name: clampStr(r.name, 200).trim(),
        lines: cleanStrList(r.lines, 10, 200),
      };
    })
    .filter((r) => r.name || r.lines.length)
    .slice(0, 20);
}

// ── Merge stored (partial) over defaults, sanitising as we go ───────────────

function mergeContent(d: SiteContent, s: Partial<SiteContent>): SiteContent {
  return {
    sections: s.sections ? normalizeSections(s.sections) : d.sections,
    term: has(s.term) ? clampStr(s.term, 80).trim() : d.term,
    dateRange: has(s.dateRange) ? clampStr(s.dateRange, 120).trim() : d.dateRange,
    tagline: has(s.tagline) ? clampStr(s.tagline, 200).trim() : d.tagline,
    intro: has(s.intro) ? clampStr(s.intro, 4000).trim() : d.intro,
    bannerImages: Array.isArray(s.bannerImages)
      ? cleanBannerImages(s.bannerImages)
      : d.bannerImages,
    bannerSeconds:
      s.bannerSeconds !== undefined
        ? cleanBannerSeconds(s.bannerSeconds)
        : d.bannerSeconds,
    quickLinks: Array.isArray(s.quickLinks) ? cleanQuickLinks(s.quickLinks) : d.quickLinks,
    announcements: Array.isArray(s.announcements)
      ? cleanAnnouncements(s.announcements)
      : d.announcements,
    glance: s.glance
      ? {
          rows: Array.isArray(s.glance.rows)
            ? cleanGlanceRows(s.glance.rows)
            : d.glance.rows,
          note: has(s.glance.note) ? clampStr(s.glance.note, 4000).trim() : d.glance.note,
        }
      : d.glance,
    presentations: s.presentations
      ? {
          intro: has(s.presentations.intro)
            ? clampStr(s.presentations.intro, 4000).trim()
            : d.presentations.intro,
          missedNote: has(s.presentations.missedNote)
            ? clampStr(s.presentations.missedNote, 2000).trim()
            : d.presentations.missedNote,
          schedule: Array.isArray(s.presentations.schedule)
            ? cleanSchedule(s.presentations.schedule)
            : d.presentations.schedule,
        }
      : d.presentations,
    rules: s.rules
      ? {
          intro: has(s.rules.intro) ? clampStr(s.rules.intro, 4000).trim() : d.rules.intro,
          expectations: Array.isArray(s.rules.expectations)
            ? cleanStrList(s.rules.expectations, 50, 600)
            : d.rules.expectations,
          agreementLink: s.rules.agreementLink
            ? cleanLink(s.rules.agreementLink)
            : d.rules.agreementLink,
        }
      : d.rules,
    mentors: s.mentors
      ? {
          intro: has(s.mentors.intro)
            ? clampStr(s.mentors.intro, 4000).trim()
            : d.mentors.intro,
          rows: Array.isArray(s.mentors.rows) ? cleanMentors(s.mentors.rows) : d.mentors.rows,
          link: s.mentors.link ? cleanLink(s.mentors.link) : d.mentors.link,
        }
      : d.mentors,
    activities: s.activities
      ? {
          intro: has(s.activities.intro)
            ? clampStr(s.activities.intro, 4000).trim()
            : d.activities.intro,
          rows: Array.isArray(s.activities.rows)
            ? cleanActivities(s.activities.rows)
            : d.activities.rows,
          link: s.activities.link ? cleanLink(s.activities.link) : d.activities.link,
          trackerLink: s.activities.trackerLink
            ? cleanLink(s.activities.trackerLink)
            : d.activities.trackerLink,
        }
      : d.activities,
    assignments: s.assignments
      ? {
          intro: has(s.assignments.intro)
            ? clampStr(s.assignments.intro, 4000).trim()
            : d.assignments.intro,
          rows: Array.isArray(s.assignments.rows)
            ? cleanAssignments(s.assignments.rows)
            : d.assignments.rows,
          link: s.assignments.link ? cleanLink(s.assignments.link) : d.assignments.link,
        }
      : d.assignments,
    capstone: s.capstone
      ? {
          intro: has(s.capstone.intro)
            ? clampStr(s.capstone.intro, 4000).trim()
            : d.capstone.intro,
          slideFlow: Array.isArray(s.capstone.slideFlow)
            ? cleanStrList(s.capstone.slideFlow, 30, 300)
            : d.capstone.slideFlow,
          guideLink: s.capstone.guideLink
            ? cleanLink(s.capstone.guideLink)
            : d.capstone.guideLink,
          published: pub(s.capstone.published),
        }
      : d.capstone,
    contacts: s.contacts
      ? {
          rows: Array.isArray(s.contacts.rows)
            ? cleanContacts(s.contacts.rows)
            : d.contacts.rows,
          locations: Array.isArray(s.contacts.locations)
            ? cleanLocations(s.contacts.locations)
            : d.contacts.locations,
        }
      : d.contacts,
  };
}

// One-time display rename: the seminar materials were originally seeded with a
// link labelled "Slides". The program now calls these "Presentation", so we
// rename that exact label whenever content is read. This keeps the live site
// correct even though the stored document still holds the old label; the next
// time an admin saves the Presentations section the new label is persisted.
// Only the exact "Slides" label is touched, so any custom labels are untouched.
function renamePresentationLabels(c: SiteContent): SiteContent {
  let changed = false;
  const schedule = c.presentations.schedule.map((row) => {
    let rowChanged = false;
    const materials = row.materials.map((m) => {
      if (m.label === "Slides") {
        rowChanged = true;
        return { ...m, label: "Presentation" };
      }
      return m;
    });
    if (!rowChanged) return row;
    changed = true;
    return { ...row, materials };
  });
  if (!changed) return c;
  return { ...c, presentations: { ...c.presentations, schedule } };
}

// ── Storage: Firestore (preferred) with local-file fallback ─────────────────

function readFile(): Partial<SiteContent> {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Partial<SiteContent>;
  } catch {
    return {};
  }
}

function writeFile(next: SiteContent): void {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, file);
}

export async function getContent(): Promise<SiteContent> {
  const d = defaultContent();
  let stored: Partial<SiteContent> = {};
  const db = getDb();
  if (db) {
    try {
      const ref = db.collection(COLLECTION).doc(DOC);
      const snap = await ref.get();
      if (snap.exists) {
        stored = (snap.data() || {}) as Partial<SiteContent>;
      } else {
        // First run: seed the document with defaults so the editors are
        // pre-populated. Best-effort — ignore failures.
        try {
          await ref.set(d);
        } catch (e) {
          console.error("[content] seeding Firestore failed", e);
        }
      }
    } catch (e) {
      console.error("[content] Firestore read failed; using file/defaults", e);
      stored = readFile();
    }
  } else {
    stored = readFile();
  }
  return renamePresentationLabels(mergeContent(d, stored));
}

export async function saveContent(patch: Partial<SiteContent>): Promise<SiteContent> {
  const current = await getContent();
  const clean: Partial<SiteContent> = {};

  if ("sections" in patch) clean.sections = normalizeSections(patch.sections);
  if ("term" in patch) clean.term = clampStr(patch.term, 80).trim();
  if ("dateRange" in patch) clean.dateRange = clampStr(patch.dateRange, 120).trim();
  if ("tagline" in patch) clean.tagline = clampStr(patch.tagline, 200).trim();
  if ("intro" in patch) clean.intro = clampStr(patch.intro, 4000).trim();
  if ("bannerImages" in patch) clean.bannerImages = cleanBannerImages(patch.bannerImages);
  if ("bannerSeconds" in patch) clean.bannerSeconds = cleanBannerSeconds(patch.bannerSeconds);
  if ("quickLinks" in patch) clean.quickLinks = cleanQuickLinks(patch.quickLinks);
  if ("announcements" in patch) clean.announcements = cleanAnnouncements(patch.announcements);
  if ("glance" in patch)
    clean.glance = {
      rows: cleanGlanceRows(patch.glance?.rows),
      note: clampStr(patch.glance?.note, 4000).trim(),
    };
  if ("presentations" in patch)
    clean.presentations = {
      intro: clampStr(patch.presentations?.intro, 4000).trim(),
      missedNote: clampStr(patch.presentations?.missedNote, 2000).trim(),
      schedule: cleanSchedule(patch.presentations?.schedule),
    };
  if ("rules" in patch)
    clean.rules = {
      intro: clampStr(patch.rules?.intro, 4000).trim(),
      expectations: cleanStrList(patch.rules?.expectations, 50, 600),
      agreementLink: cleanLink(patch.rules?.agreementLink ?? {}),
    };
  if ("mentors" in patch)
    clean.mentors = {
      intro: clampStr(patch.mentors?.intro, 4000).trim(),
      rows: cleanMentors(patch.mentors?.rows),
      link: cleanLink(patch.mentors?.link ?? {}),
    };
  if ("activities" in patch)
    clean.activities = {
      intro: clampStr(patch.activities?.intro, 4000).trim(),
      rows: cleanActivities(patch.activities?.rows),
      link: cleanLink(patch.activities?.link ?? {}),
      trackerLink: cleanLink(patch.activities?.trackerLink ?? {}),
    };
  if ("assignments" in patch)
    clean.assignments = {
      intro: clampStr(patch.assignments?.intro, 4000).trim(),
      rows: cleanAssignments(patch.assignments?.rows),
      link: cleanLink(patch.assignments?.link ?? {}),
    };
  if ("capstone" in patch)
    clean.capstone = {
      intro: clampStr(patch.capstone?.intro, 4000).trim(),
      slideFlow: cleanStrList(patch.capstone?.slideFlow, 30, 300),
      guideLink: cleanLink(patch.capstone?.guideLink ?? {}),
      published: pub(patch.capstone?.published),
    };
  if ("contacts" in patch)
    clean.contacts = {
      rows: cleanContacts(patch.contacts?.rows),
      locations: cleanLocations(patch.contacts?.locations),
    };

  const next: SiteContent = { ...current, ...clean };

  const db = getDb();
  if (db) {
    // Firestore is the source of truth when configured; surface write errors
    // so the admin can retry rather than silently diverging from the file.
    await db.collection(COLLECTION).doc(DOC).set(next);
  } else {
    writeFile(next);
  }
  return next;
}

// ── Submission window ───────────────────────────────────────────────────────

// Current Los Angeles wall-clock time as "YYYY-MM-DDTHH:mm". Zero-padded and
// big-endian, so it compares lexicographically against the stored window
// strings without any time-zone conversion.
function nowInLA(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

// Whether students may submit for a given assignment right now. "inactive" until
// the admin opens it; then "upcoming" before the start, "closed" after the
// deadline, and "open" in between (or whenever a bound is blank).
export function submissionState(row: {
  active?: boolean;
  opensAt?: string;
  closesAt?: string;
}): SubmitState {
  if (row.active !== true) return "inactive";
  const now = nowInLA();
  if (row.opensAt && now < row.opensAt) return "upcoming";
  if (row.closesAt && now > row.closesAt) return "closed";
  return "open";
}
