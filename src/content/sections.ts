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
  "citi",
  "rules",
  "mentors",
  "activities",
  "submit",
  "capstone",
  "readings",
  "contacts",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

// Friendly names shown in the admin "Page layout" manager.
export const SECTION_LABELS: Record<SectionKey, string> = {
  materials: "Fellowship Documents",
  glance: "Program at a Glance",
  presentations: "Presentations",
  citi: "CITI Training",
  rules: "Rules & Expectations",
  mentors: "Mentors",
  activities: "Self-Directed Activities",
  submit: "Submit Assignments",
  capstone: "Capstone Project",
  readings: "Recommended Readings",
  contacts: "Contacts & Addresses",
};

// The subset of sections that also appear in the floating page nav, with the
// label used there. Order in the nav follows the admin-chosen page layout, so
// these labels just rename each section. `materials` (Fellowship Documents) is
// intentionally omitted so it stays out of the nav. News and Contact Us are
// added as bookends in page.tsx (they aren't reorderable layout sections).
export const SECTION_NAV_LABELS: Partial<Record<SectionKey, string>> = {
  glance: "Program at a Glance",
  presentations: "Presentations",
  citi: "CITI Training",
  rules: "Rules and Expectations",
  mentors: "Mentors",
  activities: "Self-Directed Activity",
  submit: "Submit Assignments",
  capstone: "Capstone Project",
  readings: "Recommended Readings",
  contacts: "Important Contacts",
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
  // Insert any keys missing from the stored layout at their canonical position
  // (right after the nearest preceding registry key that is present), so a newly
  // added section lands where this file puts it — e.g. between Capstone and
  // Contacts — instead of always at the very end of a previously-saved layout.
  for (let i = 0; i < SECTION_KEYS.length; i++) {
    const key = SECTION_KEYS[i];
    if (seen.has(key)) continue;
    seen.add(key);
    let insertAt = out.length;
    for (let j = i - 1; j >= 0; j--) {
      const idx = out.findIndex((c) => c.key === SECTION_KEYS[j]);
      if (idx >= 0) {
        insertAt = idx + 1;
        break;
      }
    }
    out.splice(insertAt, 0, { key, published: true });
  }
  return out;
}
