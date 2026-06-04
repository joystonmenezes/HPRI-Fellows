// Shared registry of the page's main content sections. This is the single
// source of truth for which sections exist, their default order, and their
// human labels. It has NO server dependencies (no fs/firebase) so it can be
// imported from both the server (content.ts, page.tsx) and the client admin
// editor without leaking server-only code into the browser bundle.
//
// The keys match the section anchor ids used on the public page (so the
// floating nav anchors and smooth-scroll keep working).

export const SECTION_KEYS = [
  "materials",
  "glance",
  "presentations",
  "rules",
  "mentors",
  "activities",
  "submit",
  "capstone",
  "contacts",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

// Friendly names shown in the admin "Page layout" manager.
export const SECTION_LABELS: Record<SectionKey, string> = {
  materials: "External References",
  glance: "Program at a Glance",
  presentations: "Presentations",
  rules: "Rules & Expectations",
  mentors: "Mentors",
  activities: "Self-Directed Activities",
  submit: "Submit Assignments",
  capstone: "Capstone Project",
  contacts: "Contacts & Addresses",
};

// The subset of sections that also appear in the floating page nav, with the
// label used there. Sections not listed here never show in the nav (e.g. Quick
// Links / At a Glance / Capstone), matching the original curated nav.
export const SECTION_NAV_LABELS: Partial<Record<SectionKey, string>> = {
  submit: "Submit an assignment",
  presentations: "Presentations",
  rules: "Rules",
  mentors: "Mentors",
  activities: "Activities",
  contacts: "Contacts",
};

export type SectionConfig = { key: SectionKey; published: boolean };

// Default layout: every section visible, in the original page order.
export function defaultSections(): SectionConfig[] {
  return SECTION_KEYS.map((key) => ({ key, published: true }));
}

const KEY_SET = new Set<string>(SECTION_KEYS);

// Validate/repair a stored sections array: keep only known keys, drop
// duplicates, then append any keys that are missing (so newly added sections
// appear automatically) in their default order. Always returns all keys once.
export function normalizeSections(v: unknown): SectionConfig[] {
  const out: SectionConfig[] = [];
  const seen = new Set<string>();
  if (Array.isArray(v)) {
    for (const item of v) {
      const key = (item as { key?: unknown })?.key;
      if (typeof key === "string" && KEY_SET.has(key) && !seen.has(key)) {
        seen.add(key);
        out.push({
          key: key as SectionKey,
          // Visible unless explicitly turned off.
          published: (item as { published?: unknown })?.published !== false,
        });
      }
    }
  }
  for (const key of SECTION_KEYS) {
    if (!seen.has(key)) out.push({ key, published: true });
  }
  return out;
}
