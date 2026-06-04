// A slim section-navigation band that sits just below the hero and then sticks
// to the top (just under the cardinal header) once you scroll past it. The gold
// backdrop uses a few blurred shapes for an abstract feel; the links stay as
// cardinal-on-white pills so they read clearly against the gold.
//
// Items are passed in from the page so the nav mirrors the admin-chosen section
// order and only links to sections that are currently visible.
export function SectionNav({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Page sections"
      className="sticky top-[52px] z-40 isolate overflow-hidden border-y border-gold-dark/40 shadow-sm"
    >
      {/* Abstract gold backdrop (opaque base + soft blurred highlights). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#c8960c] via-[#e3ad12] to-[#c8960c]"
      >
        <div className="absolute -left-16 -top-20 h-44 w-44 rounded-full bg-gold-light/40 blur-2xl" />
        <div className="absolute left-1/2 -top-24 h-44 w-80 -translate-x-1/2 rounded-full bg-gold/50 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-44 w-72 rounded-full bg-cardinal/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-content px-4">
        <ul className="flex flex-nowrap items-center gap-2 overflow-x-auto py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((n) => (
            <li key={n.href} className="shrink-0">
              <a
                href={n.href}
                className="inline-flex items-center whitespace-nowrap rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold text-cardinal shadow-sm ring-1 ring-cardinal/10 backdrop-blur transition hover:bg-white hover:ring-cardinal/30"
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
