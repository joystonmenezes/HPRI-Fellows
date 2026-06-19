import type { ReactNode } from "react";
import type { Link } from "@/content/program";

export const tableTh =
  "whitespace-nowrap border-b-2 border-cardinal bg-cardinal/5 px-3 py-2 text-left font-semibold text-cardinal";
export const tableTd = "border-b border-neutral-200 px-3 py-3 align-top";

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="reveal scroll-mt-28"
    >
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <h2
          id={`${id}-heading`}
          className="font-serif text-2xl font-bold text-cardinal sm:text-3xl"
        >
          {title}
        </h2>
        <div className="mt-2 h-1 w-16 rounded bg-gold" aria-hidden="true" />
        {intro ? (
          <p className="mt-4 max-w-3xl leading-relaxed text-neutral-700">
            {intro}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

// Resource/document links open in a new tab so visitors keep the hub page
// open behind them. In-page anchors (#…) and mail/phone protocol links stay
// in the same tab (a new tab for those would be pointless or jarring).
function linkTargetProps(href: string): { target?: string; rel?: string } {
  if (/^(#|mailto:|tel:)/i.test(href)) return {};
  return { target: "_blank", rel: "noopener noreferrer" };
}

export function ActionLink({
  link,
  variant = "solid",
  className = "",
}: {
  link: Link;
  variant?: "solid" | "outline";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-center text-sm font-semibold transition";
  if (link.href) {
    const styles =
      variant === "solid"
        ? "bg-cardinal text-white hover:bg-cardinal-dark"
        : "border border-cardinal text-cardinal hover:bg-cardinal/5";
    return (
      <a
        href={link.href}
        className={`${base} ${styles} ${className}`}
        {...linkTargetProps(link.href)}
      >
        {link.label}
      </a>
    );
  }
  return (
    <span
      aria-disabled="true"
      title="Link coming soon"
      className={`${base} ${className} cursor-not-allowed border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400`}
    >
      {link.label}
      <span className="text-[10px] font-bold uppercase tracking-wide">soon</span>
    </span>
  );
}

export function MaterialLinks({ items }: { items: Link[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((m, i) =>
        m.href ? (
          <a
            key={i}
            href={m.href}
            className="rounded bg-cardinal/10 px-2 py-1 text-xs font-medium text-cardinal hover:bg-cardinal/20"
            {...linkTargetProps(m.href)}
          >
            {m.label}
          </a>
        ) : (
          <span
            key={i}
            aria-disabled="true"
            title="Link coming soon"
            className="rounded border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-400"
          >
            {m.label}
          </span>
        ),
      )}
    </div>
  );
}
