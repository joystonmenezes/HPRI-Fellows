"use client";

import { useState } from "react";

// A section-navigation band that sits just below the hero and then sticks to the
// top (just under the cardinal header) once you scroll past it. The gold backdrop
// uses a few blurred shapes for an abstract feel; the links stay as cardinal-on-
// white pills so they read clearly against the gold.
//
// Items are passed in from the page so the nav mirrors the admin-chosen section
// order and only links to sections that are currently visible.
//
// Layout: on larger screens the pills wrap onto multiple centered rows so they
// never overflow the viewport. On phones they collapse behind a top-right
// hamburger button that opens the full list.
export function SectionNav({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const pill =
    "inline-flex items-center whitespace-nowrap rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold text-cardinal shadow-sm ring-1 ring-cardinal/10 backdrop-blur transition hover:bg-white hover:ring-cardinal/30";

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
        {/* Phone: a hamburger button on the top right. */}
        <div className="flex justify-end py-2 sm:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="section-nav-menu"
            aria-label={open ? "Close section menu" : "Open section menu"}
            className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-sm font-semibold text-cardinal shadow-sm ring-1 ring-cardinal/10 backdrop-blur transition hover:bg-white"
          >
            <span className="flex flex-col gap-[3px]" aria-hidden="true">
              <span className="block h-0.5 w-5 rounded-full bg-cardinal" />
              <span className="block h-0.5 w-5 rounded-full bg-cardinal" />
              <span className="block h-0.5 w-5 rounded-full bg-cardinal" />
            </span>
            Menu
          </button>
        </div>

        {/* Desktop / tablet: centered pills that wrap onto new rows as needed. */}
        <ul className="hidden flex-wrap items-center justify-center gap-2 py-2.5 sm:flex">
          {items.map((n) => (
            <li key={n.href}>
              <a href={n.href} className={pill}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Phone: the full list, shown when the hamburger is open. */}
        {open ? (
          <ul
            id="section-nav-menu"
            className="flex flex-col gap-1.5 pb-3 sm:hidden"
          >
            {items.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-cardinal shadow-sm ring-1 ring-cardinal/10 transition hover:bg-white"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </nav>
  );
}
