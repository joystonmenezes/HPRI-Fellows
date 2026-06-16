"use client";

import {
  useState,
  Children,
  createContext,
  useContext,
  type ReactNode,
  type FormEvent,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { type SectionConfig, SECTION_LABELS } from "@/content/sections";

const labelClass = "block text-sm font-semibold text-neutral-800";
const inputClass =
  "mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-cardinal focus:outline-none";
const btnPrimary =
  "inline-flex items-center rounded-md bg-cardinal px-4 py-2 text-sm font-semibold text-white transition hover:bg-cardinal-dark disabled:opacity-60";
const btnGhost =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50";

type SaveStatus = "idle" | "saving" | "saved" | "error";

async function postContent(patch: Record<string, unknown>) {
  const res = await fetch("/api/admin/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) throw new Error(json.error || "Could not save changes.");
}

function SaveBar({ status, error }: { status: SaveStatus; error: string }) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <button type="submit" disabled={status === "saving"} className={btnPrimary}>
        {status === "saving" ? "Saving…" : "Save changes"}
      </button>
      {status === "saved" ? (
        <span className="text-sm font-medium text-green-700">Saved.</span>
      ) : null}
      {status === "error" ? (
        <span role="alert" className="text-sm font-medium text-red-700">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function useSaver() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  async function save(patch: Record<string, unknown>) {
    setStatus("saving");
    setError("");
    try {
      await postContent(patch);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not save changes.");
    }
  }
  return { status, error, setStatus, save };
}

// Move an item from one index to another, returning a new array (used by the
// drag-to-reorder lists below).
function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// Drag-and-drop reordering for a vertical list. Spread handleProps(i) onto the
// grip handle (the drag source) and rowProps(i) onto the row/card container (the
// drop target). Keeping them separate lets a card full of inputs stay editable —
// only the little handle starts a drag, never the whole card. dragIndex/overIndex
// drive the visual feedback. Dropping calls onReorder(from, to), so dragging the
// last row onto the first moves it all the way up in a single gesture.
function useDragReorder(onReorder: (from: number, to: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function reset() {
    setDragIndex(null);
    setOverIndex(null);
  }

  // Goes on the grip handle only.
  function handleProps(i: number) {
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        setDragIndex(i);
        e.dataTransfer.effectAllowed = "move";
        // Firefox needs some data set for a drag to begin.
        try {
          e.dataTransfer.setData("text/plain", String(i));
        } catch {
          /* ignore */
        }
      },
      onDragEnd: reset,
    };
  }

  // Goes on the row/card container. The dragIndex===null guard ignores drags
  // that didn't start from one of our handles (e.g. selected text or a file
  // dropped in), so they can't accidentally reorder the list.
  function rowProps(i: number) {
    return {
      onDragOver: (e: DragEvent) => {
        if (dragIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (overIndex !== i) setOverIndex(i);
      },
      onDrop: (e: DragEvent) => {
        if (dragIndex === null) return;
        e.preventDefault();
        if (dragIndex !== i) onReorder(dragIndex, i);
        reset();
      },
    };
  }

  return { dragIndex, overIndex, handleProps, rowProps };
}

// A six-dot drag affordance shown at the left of reorderable rows.
function GripIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
    >
      <circle cx="7" cy="4" r="1.3" />
      <circle cx="7" cy="10" r="1.3" />
      <circle cx="7" cy="16" r="1.3" />
      <circle cx="13" cy="4" r="1.3" />
      <circle cx="13" cy="10" r="1.3" />
      <circle cx="13" cy="16" r="1.3" />
    </svg>
  );
}

type DragHandleProps = {
  draggable: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
};

// The grab affordance that starts a drag. Only this handle is draggable, so the
// inputs inside a card stay clickable and selectable. Spread handleProps(i) on it.
function DragHandle({
  className = "",
  ...props
}: DragHandleProps & { className?: string }) {
  return (
    <span
      {...props}
      title="Drag to reorder"
      aria-label="Drag to reorder"
      className={`shrink-0 cursor-grab text-neutral-400 transition hover:text-neutral-600 active:cursor-grabbing ${className}`}
    >
      <GripIcon />
    </span>
  );
}

// Visual feedback for a reorderable card/row: fade the one being dragged and ring
// the one it is hovering over. Append the result to the element's own classes.
function dragState(
  drag: { dragIndex: number | null; overIndex: number | null },
  i: number,
): string {
  if (drag.dragIndex === i) return "opacity-50";
  if (drag.overIndex === i) return "ring-2 ring-cardinal/40";
  return "";
}

// A small header (drag handle + position number) for editor cards that have no
// heading of their own, so every reorderable list shows its current order.
function ReorderHeader({
  handle,
  index,
}: {
  handle: DragHandleProps;
  index: number;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <DragHandle {...handle} />
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
        {index + 1}
      </span>
    </div>
  );
}

// Accordion coordination: a provider tracks which section cards are open so the
// page can start with a couple expanded and collapse the rest when another is
// opened. Each CollapsibleForm reports its own id and reads its open state here.
type AccordionState = {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
};

const AccordionCtx = createContext<AccordionState | null>(null);

export function AccordionProvider({
  defaultOpenIds = [],
  children,
}: {
  defaultOpenIds?: string[];
  children: ReactNode;
}) {
  // Start with the requested cards open; once the user opens a different card we
  // switch to single-open so only one section is expanded at a time.
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);
  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id]));
  const isOpen = (id: string) => openIds.includes(id);
  return (
    <AccordionCtx.Provider value={{ isOpen, toggle }}>{children}</AccordionCtx.Provider>
  );
}

// A section card that collapses. The first child (the section heading) stays
// visible as the clickable summary; the rest is shown only when expanded. Inputs
// stay mounted while collapsed, so unsaved edits are preserved. When wrapped in an
// AccordionProvider, open/close is driven by shared state (preventDefault stops the
// native <details> toggle so React stays the single source of truth).
function CollapsibleForm({
  id,
  onSubmit,
  children,
}: {
  id: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  const acc = useContext(AccordionCtx);
  const items = Children.toArray(children);
  const heading = items[0];
  const body = items.slice(1);
  return (
    <details
      open={acc ? acc.isOpen(id) : undefined}
      className="rounded-lg border border-neutral-200 bg-white shadow-sm [&[open]_svg]:rotate-180"
    >
      <summary
        onClick={
          acc
            ? (e) => {
                e.preventDefault();
                acc.toggle(id);
              }
            : undefined
        }
        className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-5 py-4 transition hover:bg-neutral-50/60 [&::-webkit-details-marker]:hidden"
      >
        <span className="min-w-0 grow">{heading}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5 shrink-0 text-cardinal transition-transform duration-200"
        >
          <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <form className="border-t border-neutral-200 px-5 pb-5 pt-4" onSubmit={onSubmit}>
        {body}
      </form>
    </details>
  );
}

// Page layout manager: reorder the main content sections and choose which ones
// appear on the public site. Order + visibility are saved together and drive
// both the public page and the floating nav.
export function SectionsEditor({ initial }: { initial: SectionConfig[] }) {
  const [rows, setRows] = useState<SectionConfig[]>(initial.map((r) => ({ ...r })));
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");

  function toggle(i: number) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, published: !r.published } : r)),
    );
    touch();
  }

  const drag = useDragReorder((from, to) => {
    setRows((prev) => reorder(prev, from, to));
    touch();
  });

  return (
    <CollapsibleForm
      id="sections"
      onSubmit={(e) => {
        e.preventDefault();
        save({ sections: rows });
      }}
    >
      <h2 className="font-serif text-xl font-bold text-cardinal">Page layout</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Drag a section by its handle to drop it exactly where you want, and
        untick “Show on site” to hide a whole section (it stays here so you can
        bring it back any time). The hero banner, news band, and footer always
        stay in place.
      </p>
      <ul className="mt-4 space-y-2">
        {rows.map((r, i) => (
          <li
            key={r.key}
            {...drag.handleProps(i)}
            {...drag.rowProps(i)}
            className={`flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-sm transition ${
              drag.dragIndex === i
                ? "border-cardinal opacity-50"
                : drag.overIndex === i
                  ? "border-cardinal ring-2 ring-cardinal/30"
                  : "border-neutral-200"
            } cursor-grab active:cursor-grabbing`}
          >
            <span
              aria-hidden="true"
              title="Drag to reorder"
              className="shrink-0 cursor-grab text-neutral-400 active:cursor-grabbing"
            >
              <GripIcon />
            </span>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
              {i + 1}
            </span>
            <span
              className={`grow font-medium ${
                r.published ? "text-neutral-900" : "text-neutral-400 line-through"
              }`}
            >
              {SECTION_LABELS[r.key]}
            </span>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={r.published}
                onChange={() => toggle(i)}
                className="h-4 w-4 rounded border-neutral-300 text-cardinal focus:ring-cardinal"
              />
              Show on site
            </label>
          </li>
        ))}
      </ul>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

// Banner photos: upload images or paste links for the hero. Several photos play
// as a slideshow on the public site; drag to reorder; with none the bundled
// banner photo is used.
export function BannerEditor({
  initial,
  seconds: initialSeconds,
}: {
  initial: string[];
  seconds: number;
}) {
  const [rows, setRows] = useState<string[]>(initial.slice());
  const [seconds, setSeconds] = useState<string>(String(initialSeconds));
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");

  const drag = useDragReorder((from, to) => {
    setRows((prev) => reorder(prev, from, to));
    touch();
  });

  function removeAt(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    touch();
  }

  function addUrl() {
    const u = urlInput.trim();
    if (!u) return;
    setRows((prev) => [...prev, u]);
    setUrlInput("");
    touch();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked later
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/banner", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok || !json.url) {
        throw new Error(json.error || "Upload failed.");
      }
      setRows((prev) => [...prev, json.url as string]);
      touch();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <CollapsibleForm
      id="banner"
      onSubmit={(e) => {
        e.preventDefault();
        save({ bannerImages: rows, bannerSeconds: parseFloat(seconds) || 2 });
      }}
    >
      <h2 className="font-serif text-xl font-bold text-cardinal">
        Banner photos
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        Photos for the big banner at the top of the page. Add several and they
        play as a slideshow — fading from one to the next, like a photo story
        (set the speed below). With none, the built-in banner photo is used.
        Drag to set the order, then press “Save changes”.
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-500">
          No banner photos yet — the default banner is showing. Add one below.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((src, i) => (
            <li
              key={`${i}-${src}`}
              {...drag.handleProps(i)}
              {...drag.rowProps(i)}
              className={`flex items-center gap-3 rounded-md border bg-white px-3 py-2 shadow-sm transition ${
                drag.dragIndex === i
                  ? "border-cardinal opacity-50"
                  : drag.overIndex === i
                    ? "border-cardinal ring-2 ring-cardinal/30"
                    : "border-neutral-200"
              } cursor-grab active:cursor-grabbing`}
            >
              <span
                aria-hidden="true"
                title="Drag to reorder"
                className="shrink-0 text-neutral-300"
              >
                <GripIcon />
              </span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                {i + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-12 w-20 shrink-0 rounded object-cover ring-1 ring-neutral-200"
              />
              <span className="grow truncate text-xs text-neutral-500">
                {src}
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="banner-file" className={labelClass}>
            Upload a photo
          </label>
          <input
            id="banner-file"
            type="file"
            accept="image/*"
            onChange={onFile}
            disabled={uploading}
            className="mt-1 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-cardinal file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cardinal-dark"
          />
          {uploading ? (
            <p className="mt-1 text-xs text-neutral-500">Uploading…</p>
          ) : null}
          {uploadError ? (
            <p className="mt-1 text-xs text-red-600">{uploadError}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="banner-url" className={labelClass}>
            …or paste an image link
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="banner-url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
              placeholder="https://…"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-cardinal focus:outline-none"
            />
            <button type="button" onClick={addUrl} className={btnGhost}>
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="banner-seconds" className={labelClass}>
          Slideshow speed
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="banner-seconds"
            type="number"
            min={1}
            max={30}
            step={0.5}
            value={seconds}
            onChange={(e) => {
              setSeconds(e.target.value);
              touch();
            }}
            className="w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-cardinal focus:outline-none"
          />
          <span className="text-sm text-neutral-500">
            seconds each photo shows before fading to the next (only with 2+
            photos)
          </span>
        </div>
      </div>

      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

export function BasicsEditor({
  initial,
}: {
  initial: { term: string; dateRange: string; tagline: string; intro: string };
}) {
  const [term, setTerm] = useState(initial.term);
  const [dateRange, setDateRange] = useState(initial.dateRange);
  const [tagline, setTagline] = useState(initial.tagline);
  const [intro, setIntro] = useState(initial.intro);
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        save({ term, dateRange, tagline, intro });
      }}
      id="basics"
    >
      <h2 className="font-serif text-xl font-bold text-cardinal">
        Header &amp; intro
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        The term, dates, tagline, and opening paragraph at the top of the page.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="f-term" className={labelClass}>
            Term
          </label>
          <input
            id="f-term"
            className={inputClass}
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              touch();
            }}
          />
        </div>
        <div>
          <label htmlFor="f-dates" className={labelClass}>
            Date range
          </label>
          <input
            id="f-dates"
            className={inputClass}
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              touch();
            }}
          />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="f-tagline" className={labelClass}>
          Tagline
        </label>
        <input
          id="f-tagline"
          className={inputClass}
          value={tagline}
          onChange={(e) => {
            setTagline(e.target.value);
            touch();
          }}
        />
      </div>
      <div className="mt-4">
        <label htmlFor="f-intro" className={labelClass}>
          Intro paragraph
        </label>
        <textarea
          id="f-intro"
          rows={5}
          className={inputClass}
          value={intro}
          onChange={(e) => {
            setIntro(e.target.value);
            touch();
          }}
        />
      </div>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

type LinkRow = { label: string; href: string };
type QuickLinkRow = { label: string; href: string; published: boolean };

export function QuickLinksEditor({
  initial,
}: {
  initial: { label: string; href?: string; published?: boolean }[];
}) {
  const [rows, setRows] = useState<QuickLinkRow[]>(
    initial.map((l) => ({
      label: l.label,
      href: l.href || "",
      published: l.published !== false,
    })),
  );
  const { status, error, setStatus, save } = useSaver();

  function update(i: number, patch: Partial<QuickLinkRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setStatus("idle");
  }
  const drag = useDragReorder((from, to) => {
    setRows((rs) => reorder(rs, from, to));
    setStatus("idle");
  });

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        const quickLinks = rows
          .map((r) => ({
            label: r.label.trim(),
            href: r.href.trim() || undefined,
            published: r.published,
          }))
          .filter((r) => r.label);
        save({ quickLinks });
      }}
      id="links"
    >
      <h2 className="font-serif text-xl font-bold text-cardinal">External References</h2>
      <p className="mt-1 text-sm text-neutral-600">
        The buttons in the “External References” grid. Leave the web address blank to
        show a grey “soon” placeholder until the document is ready. Uncheck
        “Published” to hide a link without deleting it.
      </p>
      <div className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            {...drag.rowProps(i)}
            className={`rounded-md border border-neutral-200 p-3 transition ${dragState(drag, i)}`}
          >
            <ReorderHeader handle={drag.handleProps(i)} index={i} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Button text</label>
                <input
                  className={inputClass}
                  value={r.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Web address{" "}
                  <span className="font-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <input
                  className={inputClass}
                  value={r.href}
                  placeholder="https://…"
                  onChange={(e) => update(i, { href: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <PublishToggle
                checked={r.published}
                onChange={(v) => update(i, { published: v })}
              />
              <button
                type="button"
                onClick={() => {
                  setRows((rs) => rs.filter((_, idx) => idx !== i));
                  setStatus("idle");
                }}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((rs) => [...rs, { label: "", href: "", published: true }]);
          setStatus("idle");
        }}
        className={`${btnGhost} mt-3`}
      >
        + Add link
      </button>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

type AnnRow = { title: string; date: string; body: string; published: boolean };

export function AnnouncementsEditor({
  initial,
}: {
  initial: { title: string; body: string; date: string; published: boolean }[];
}) {
  const [items, setItems] = useState<AnnRow[]>(
    initial.map((a) => ({
      title: a.title,
      date: a.date,
      body: a.body,
      published: a.published,
    })),
  );
  const { status, error, setStatus, save } = useSaver();

  function update(i: number, patch: Partial<AnnRow>) {
    setItems((it) => it.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
    setStatus("idle");
  }
  const drag = useDragReorder((from, to) => {
    setItems((it) => reorder(it, from, to));
    setStatus("idle");
  });

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        save({ announcements: items });
      }}
      id="news"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-bold text-cardinal">
          News &amp; announcements
        </h2>
        <span className="text-sm text-neutral-500">{items.length} total</span>
      </div>
      <p className="mt-1 text-sm text-neutral-600">
        Posts shown in the “News &amp; Announcements” band near the top of the
        page. Uncheck “Published” to hide one without deleting it.
      </p>
      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-neutral-500">No announcements yet.</p>
        ) : null}
        {items.map((a, i) => (
          <div
            key={i}
            {...drag.rowProps(i)}
            className={`rounded-md border border-neutral-200 p-4 transition ${dragState(drag, i)}`}
          >
            <ReorderHeader handle={drag.handleProps(i)} index={i} />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  value={a.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={a.date}
                  onChange={(e) => update(i, { date: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelClass}>Message</label>
              <textarea
                rows={3}
                className={inputClass}
                value={a.body}
                onChange={(e) => update(i, { body: e.target.value })}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                <input
                  type="checkbox"
                  checked={a.published}
                  onChange={(e) => update(i, { published: e.target.checked })}
                />
                Published
              </label>
              <button
                type="button"
                onClick={() => {
                  setItems((it) => it.filter((_, idx) => idx !== i));
                  setStatus("idle");
                }}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setItems((it) => [
            {
              title: "",
              date: new Date().toISOString().slice(0, 10),
              body: "",
              published: true,
            },
            ...it,
          ]);
          setStatus("idle");
        }}
        className={`${btnGhost} mt-4`}
      >
        + Add announcement
      </button>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

// ── Shared building blocks for the section editors ──────────────────────────

const toRow = (l?: { label?: string; href?: string }): LinkRow => ({
  label: l?.label || "",
  href: l?.href || "",
});
const fromRow = (r: LinkRow): { label: string; href?: string } => ({
  label: r.label.trim(),
  href: r.href.trim() || undefined,
});

const removeBtn =
  "h-[38px] shrink-0 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 transition hover:bg-red-50";
const sectionLead = "mt-1 text-sm text-neutral-600";

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-serif text-xl font-bold text-cardinal">{title}</h2>
      {typeof count === "number" ? (
        <span className="text-sm text-neutral-500">{count} total</span>
      ) : null}
    </div>
  );
}

// Per-item "show on the public site" toggle. Unchecking hides the item on the
// public page without deleting it here.
function PublishToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex select-none items-center gap-2 text-sm font-medium text-neutral-700">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-neutral-300 text-cardinal focus:ring-cardinal"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      Published
    </label>
  );
}

// Admin gate for student uploads. Off by default: while unchecked the public
// "Submit here" button is greyed out and shows "Not yet active".
function ActivateToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex select-none items-center gap-2 text-sm font-medium text-neutral-700">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-neutral-300 text-green-600 focus:ring-green-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      Open for submissions
    </label>
  );
}

// A single editable link (button text + optional web address).
function SingleLink({
  title,
  link,
  onChange,
}: {
  title: string;
  link: LinkRow;
  onChange: (l: LinkRow) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <label className={labelClass}>{title} — button text</label>
        <input
          className={inputClass}
          value={link.label}
          onChange={(e) => onChange({ ...link, label: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass}>
          {title} — web address{" "}
          <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <input
          className={inputClass}
          placeholder="https://…"
          value={link.href}
          onChange={(e) => onChange({ ...link, href: e.target.value })}
        />
      </div>
    </div>
  );
}

// An add/remove list of plain text lines.
function StringList({
  items,
  onChange,
  addLabel,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  placeholder?: string;
}) {
  const drag = useDragReorder((from, to) => onChange(reorder(items, from, to)));
  return (
    <div className="space-y-2">
      {items.map((s, i) => (
        <div
          key={i}
          {...drag.rowProps(i)}
          className={`flex items-center gap-2 rounded-md transition ${dragState(drag, i)}`}
        >
          <DragHandle {...drag.handleProps(i)} />
          <input
            className={inputClass}
            value={s}
            placeholder={placeholder}
            onChange={(e) =>
              onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))
            }
          />
          <button
            type="button"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className={removeBtn}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className={btnGhost}
      >
        {addLabel}
      </button>
    </div>
  );
}

// An add/remove list of links (label + optional web address). Used for the
// "Materials" column on each presentation row.
function LinksList({
  links,
  onChange,
}: {
  links: LinkRow[];
  onChange: (links: LinkRow[]) => void;
}) {
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div
          key={i}
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center"
        >
          <input
            className={inputClass}
            value={l.label}
            placeholder="Label (e.g. Presentation)"
            onChange={(e) =>
              onChange(
                links.map((x, idx) =>
                  idx === i ? { ...x, label: e.target.value } : x,
                ),
              )
            }
          />
          <input
            className={inputClass}
            value={l.href}
            placeholder="https://… (optional)"
            onChange={(e) =>
              onChange(
                links.map((x, idx) =>
                  idx === i ? { ...x, href: e.target.value } : x,
                ),
              )
            }
          />
          <button
            type="button"
            aria-label="Remove link"
            onClick={() => onChange(links.filter((_, idx) => idx !== i))}
            className={removeBtn}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...links, { label: "", href: "" }])}
        className={btnGhost}
      >
        + Add link
      </button>
    </div>
  );
}

// ── Program at a Glance ─────────────────────────────────────────────────────

type GlanceR = { label: string; value: string };

export function GlanceEditor({
  initial,
}: {
  initial: { rows: GlanceR[]; note: string };
}) {
  const [rows, setRows] = useState<GlanceR[]>(initial.rows.map((r) => ({ ...r })));
  const [note, setNote] = useState(initial.note);
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");
  const drag = useDragReorder((from, to) => {
    setRows((rs) => reorder(rs, from, to));
    touch();
  });

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        const clean = rows
          .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
          .filter((r) => r.label || r.value);
        save({ glance: { rows: clean, note: note.trim() } });
      }}
      id="glance"
    >
      <SectionHeading title="Program at a glance" count={rows.length} />
      <p className={sectionLead}>
        The label/value rows in the “Program at a Glance” table, plus the note
        underneath it.
      </p>
      <div className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            {...drag.rowProps(i)}
            className={`grid items-start gap-2 rounded-md transition sm:grid-cols-[auto_14rem_1fr_auto] ${dragState(drag, i)}`}
          >
            <DragHandle {...drag.handleProps(i)} className="mt-2" />
            <input
              className={inputClass}
              value={r.label}
              placeholder="Label (e.g. Dates)"
              onChange={(e) => {
                setRows((rs) =>
                  rs.map((x, idx) =>
                    idx === i ? { ...x, label: e.target.value } : x,
                  ),
                );
                touch();
              }}
            />
            <textarea
              rows={2}
              className={inputClass}
              value={r.value}
              placeholder="Details"
              onChange={(e) => {
                setRows((rs) =>
                  rs.map((x, idx) =>
                    idx === i ? { ...x, value: e.target.value } : x,
                  ),
                );
                touch();
              }}
            />
            <button
              type="button"
              onClick={() => {
                setRows((rs) => rs.filter((_, idx) => idx !== i));
                touch();
              }}
              className={removeBtn}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((rs) => [...rs, { label: "", value: "" }]);
          touch();
        }}
        className={`${btnGhost} mt-3`}
      >
        + Add row
      </button>
      <div className="mt-4">
        <label className={labelClass}>Note (shown below the table)</label>
        <textarea
          rows={3}
          className={inputClass}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            touch();
          }}
        />
      </div>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

// ── Presentations ───────────────────────────────────────────────────────────

type SchedRow = {
  week: string;
  when: string;
  type: string;
  topic: string;
  location: string;
  materials: LinkRow[];
  published: boolean;
};

export function PresentationsEditor({
  initial,
}: {
  initial: {
    intro: string;
    missedNote: string;
    schedule: {
      week: string;
      when: string;
      type: string;
      topic: string;
      location: string;
      materials: { label: string; href?: string }[];
      published?: boolean;
    }[];
  };
}) {
  const [intro, setIntro] = useState(initial.intro);
  const [missedNote, setMissedNote] = useState(initial.missedNote);
  const [rows, setRows] = useState<SchedRow[]>(
    initial.schedule.map((s) => ({
      week: s.week,
      when: s.when,
      type: s.type,
      topic: s.topic,
      location: s.location,
      materials: s.materials.map(toRow),
      published: s.published !== false,
    })),
  );
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");
  const setRow = (i: number, patch: Partial<SchedRow>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    touch();
  };
  const drag = useDragReorder((from, to) => {
    setRows((rs) => reorder(rs, from, to));
    touch();
  });

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        const schedule = rows
          .map((r) => ({
            week: r.week.trim(),
            when: r.when.trim(),
            type: r.type.trim(),
            topic: r.topic.trim(),
            location: r.location.trim(),
            materials: r.materials.map(fromRow).filter((m) => m.label),
            published: r.published,
          }))
          .filter(
            (r) => r.week || r.when || r.type || r.topic || r.location,
          );
        save({ presentations: { intro: intro.trim(), missedNote: missedNote.trim(), schedule } });
      }}
      id="presentations"
    >
      <SectionHeading title="Presentations & schedule" count={rows.length} />
      <p className={sectionLead}>
        Seminars and Tuesday Talks. Add the Presentation / Recording / Reflection links
        as they become available — leave a link’s address blank to show a grey
        “soon” chip. Sessions are collapsed so the list is easy to reorder —
        drag one by its handle, or click it to expand and edit.
      </p>
      <div className="mt-4">
        <label className={labelClass}>Intro</label>
        <textarea
          rows={2}
          className={inputClass}
          value={intro}
          onChange={(e) => {
            setIntro(e.target.value);
            touch();
          }}
        />
      </div>
      <div className="mt-4 space-y-4">
        {rows.map((r, i) => (
          <div
            key={i}
            {...drag.rowProps(i)}
            className={`rounded-md border border-neutral-200 transition ${dragState(drag, i)}`}
          >
            <details className="[&[open]_.sess-chevron]:rotate-180">
              <summary className="flex cursor-pointer list-none items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
                <DragHandle {...drag.handleProps(i)} />
                <span className="shrink-0 text-sm font-semibold text-neutral-700">
                  Session {i + 1}
                </span>
                {r.when ? (
                  <span className="min-w-0 truncate text-sm text-neutral-500">
                    · {r.when}
                  </span>
                ) : null}
                {!r.published ? (
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                    Hidden
                  </span>
                ) : null}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="sess-chevron ml-auto h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200"
                >
                  <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="border-t border-neutral-200 p-4">
                <div className="flex items-center justify-end gap-3">
                  <PublishToggle
                    checked={r.published}
                    onChange={(v) => setRow(i, { published: v })}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setRows((rs) => rs.filter((_, idx) => idx !== i));
                      touch();
                    }}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
                  >
                    Delete session
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Week</label>
                    <input
                      className={inputClass}
                      value={r.week}
                      onChange={(e) => setRow(i, { week: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Date / time</label>
                    <input
                      className={inputClass}
                      value={r.when}
                      onChange={(e) => setRow(i, { when: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Type</label>
                    <input
                      className={inputClass}
                      value={r.type}
                      onChange={(e) => setRow(i, { type: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className={labelClass}>Topic / presenter</label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={r.topic}
                    onChange={(e) => setRow(i, { topic: e.target.value })}
                  />
                </div>
                <div className="mt-2">
                  <label className={labelClass}>Location / format</label>
                  <input
                    className={inputClass}
                    value={r.location}
                    onChange={(e) => setRow(i, { location: e.target.value })}
                  />
                </div>
                <div className="mt-3">
                  <label className={labelClass}>Materials</label>
                  <div className="mt-1">
                    <LinksList
                      links={r.materials}
                      onChange={(materials) => setRow(i, { materials })}
                    />
                  </div>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((rs) => [
            ...rs,
            {
              week: "",
              when: "",
              type: "",
              topic: "",
              location: "",
              materials: [],
              published: true,
            },
          ]);
          touch();
        }}
        className={`${btnGhost} mt-4`}
      >
        + Add session
      </button>
      <div className="mt-4">
        <label className={labelClass}>Missed-seminar note</label>
        <textarea
          rows={2}
          className={inputClass}
          value={missedNote}
          onChange={(e) => {
            setMissedNote(e.target.value);
            touch();
          }}
        />
      </div>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

// ── Rules ───────────────────────────────────────────────────────────────────

export function RulesEditor({
  initial,
}: {
  initial: {
    intro: string;
    expectations: string[];
    agreementLink: { label: string; href?: string };
  };
}) {
  const [intro, setIntro] = useState(initial.intro);
  const [expectations, setExpectations] = useState<string[]>([
    ...initial.expectations,
  ]);
  const [linkRow, setLinkRow] = useState<LinkRow>(toRow(initial.agreementLink));
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        save({
          rules: {
            intro: intro.trim(),
            expectations: expectations.map((s) => s.trim()).filter(Boolean),
            agreementLink: fromRow(linkRow),
          },
        });
      }}
      id="rules"
    >
      <SectionHeading title="Rules & expectations" count={expectations.length} />
      <p className={sectionLead}>
        The intro paragraph, the bulleted key-expectations list, and the
        participation-agreement link.
      </p>
      <div className="mt-4">
        <label className={labelClass}>Intro</label>
        <textarea
          rows={3}
          className={inputClass}
          value={intro}
          onChange={(e) => {
            setIntro(e.target.value);
            touch();
          }}
        />
      </div>
      <div className="mt-4">
        <label className={labelClass}>Key expectations</label>
        <div className="mt-1">
          <StringList
            items={expectations}
            onChange={(items) => {
              setExpectations(items);
              touch();
            }}
            addLabel="+ Add expectation"
            placeholder="Expectation…"
          />
        </div>
      </div>
      <div className="mt-4">
        <SingleLink
          title="Agreement link"
          link={linkRow}
          onChange={(l) => {
            setLinkRow(l);
            touch();
          }}
        />
      </div>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

// ── Mentors ─────────────────────────────────────────────────────────────────

type MentorR = {
  fellow: string;
  primary: string;
  secondary: string;
  area: string;
  published: boolean;
};

export function MentorsEditor({
  initial,
}: {
  initial: {
    intro: string;
    rows: {
      fellow: string;
      primary: string;
      secondary: string;
      area: string;
      published?: boolean;
    }[];
    link: { label: string; href?: string };
  };
}) {
  const [intro, setIntro] = useState(initial.intro);
  const [rows, setRows] = useState<MentorR[]>(
    initial.rows.map((r) => ({
      fellow: r.fellow,
      primary: r.primary,
      secondary: r.secondary,
      area: r.area,
      published: r.published !== false,
    })),
  );
  const [linkRow, setLinkRow] = useState<LinkRow>(toRow(initial.link));
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");
  const setRow = (i: number, patch: Partial<MentorR>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    touch();
  };
  const drag = useDragReorder((from, to) => {
    setRows((rs) => reorder(rs, from, to));
    touch();
  });

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        const clean = rows
          .map((r) => ({
            fellow: r.fellow.trim(),
            primary: r.primary.trim(),
            secondary: r.secondary.trim(),
            area: r.area.trim(),
            published: r.published,
          }))
          .filter((r) => r.fellow || r.primary || r.secondary || r.area);
        save({ mentors: { intro: intro.trim(), rows: clean, link: fromRow(linkRow) } });
      }}
      id="mentors"
    >
      <SectionHeading title="Mentors" count={rows.length} />
      <p className={sectionLead}>
        Fellow ↔ mentor pairings. Use “—” as a placeholder for rows you haven’t
        filled in yet.
      </p>
      <div className="mt-4">
        <label className={labelClass}>Intro</label>
        <textarea
          rows={3}
          className={inputClass}
          value={intro}
          onChange={(e) => {
            setIntro(e.target.value);
            touch();
          }}
        />
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            {...drag.rowProps(i)}
            className={`rounded-md border border-neutral-200 p-4 transition ${dragState(drag, i)}`}
          >
            <ReorderHeader handle={drag.handleProps(i)} index={i} />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClass}>Fellow</label>
                <input
                  className={inputClass}
                  value={r.fellow}
                  onChange={(e) => setRow(i, { fellow: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Primary</label>
                <input
                  className={inputClass}
                  value={r.primary}
                  onChange={(e) => setRow(i, { primary: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Secondary</label>
                <input
                  className={inputClass}
                  value={r.secondary}
                  onChange={(e) => setRow(i, { secondary: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Project area</label>
                <input
                  className={inputClass}
                  value={r.area}
                  onChange={(e) => setRow(i, { area: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <PublishToggle
                checked={r.published}
                onChange={(v) => setRow(i, { published: v })}
              />
              <button
                type="button"
                onClick={() => {
                  setRows((rs) => rs.filter((_, idx) => idx !== i));
                  touch();
                }}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((rs) => [
            ...rs,
            { fellow: "", primary: "", secondary: "", area: "", published: true },
          ]);
          touch();
        }}
        className={`${btnGhost} mt-3`}
      >
        + Add mentor row
      </button>
      <div className="mt-4">
        <SingleLink
          title="Mentor list link"
          link={linkRow}
          onChange={(l) => {
            setLinkRow(l);
            touch();
          }}
        />
      </div>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

// ── Activities ──────────────────────────────────────────────────────────────

type ActivityR = { activity: string; deliverable: string; published: boolean };

export function ActivitiesEditor({
  initial,
}: {
  initial: {
    intro: string;
    rows: { activity: string; deliverable: string; published?: boolean }[];
    link: { label: string; href?: string };
    trackerLink: { label: string; href?: string };
  };
}) {
  const [intro, setIntro] = useState(initial.intro);
  const [rows, setRows] = useState<ActivityR[]>(
    initial.rows.map((r) => ({
      activity: r.activity,
      deliverable: r.deliverable,
      published: r.published !== false,
    })),
  );
  const [linkRow, setLinkRow] = useState<LinkRow>(toRow(initial.link));
  const [trackerRow, setTrackerRow] = useState<LinkRow>(toRow(initial.trackerLink));
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");
  const setRow = (i: number, patch: Partial<ActivityR>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    touch();
  };
  const drag = useDragReorder((from, to) => {
    setRows((rs) => reorder(rs, from, to));
    touch();
  });

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        const clean = rows
          .map((r) => ({
            activity: r.activity.trim(),
            deliverable: r.deliverable.trim(),
            published: r.published,
          }))
          .filter((r) => r.activity || r.deliverable);
        save({
          activities: {
            intro: intro.trim(),
            rows: clean,
            link: fromRow(linkRow),
            trackerLink: fromRow(trackerRow),
          },
        });
      }}
      id="activities"
    >
      <SectionHeading title="Self-directed activities" count={rows.length} />
      <p className={sectionLead}>
        The activity / deliverable options table and its two links.
      </p>
      <div className="mt-4">
        <label className={labelClass}>Intro</label>
        <textarea
          rows={2}
          className={inputClass}
          value={intro}
          onChange={(e) => {
            setIntro(e.target.value);
            touch();
          }}
        />
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            {...drag.rowProps(i)}
            className={`rounded-md border border-neutral-200 p-4 transition ${dragState(drag, i)}`}
          >
            <ReorderHeader handle={drag.handleProps(i)} index={i} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Activity</label>
                <input
                  className={inputClass}
                  value={r.activity}
                  onChange={(e) => setRow(i, { activity: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Possible deliverable</label>
                <input
                  className={inputClass}
                  value={r.deliverable}
                  onChange={(e) => setRow(i, { deliverable: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <PublishToggle
                checked={r.published}
                onChange={(v) => setRow(i, { published: v })}
              />
              <button
                type="button"
                onClick={() => {
                  setRows((rs) => rs.filter((_, idx) => idx !== i));
                  touch();
                }}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((rs) => [...rs, { activity: "", deliverable: "", published: true }]);
          touch();
        }}
        className={`${btnGhost} mt-3`}
      >
        + Add activity
      </button>
      <div className="mt-4 space-y-3">
        <SingleLink
          title="Full activity list"
          link={linkRow}
          onChange={(l) => {
            setLinkRow(l);
            touch();
          }}
        />
        <SingleLink
          title="Planning tracker"
          link={trackerRow}
          onChange={(l) => {
            setTrackerRow(l);
            touch();
          }}
        />
      </div>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

// ── Assignments (list shown on the Submit Assignments table) ────────────────

type AssignR = {
  assignment: string;
  due: string;
  published: boolean;
  active: boolean;
  opensAt: string;
  closesAt: string;
};

export function AssignmentsEditor({
  initial,
}: {
  initial: {
    intro: string;
    rows: {
      assignment: string;
      due: string;
      published?: boolean;
      active?: boolean;
      opensAt?: string;
      closesAt?: string;
    }[];
    link: { label: string; href?: string };
  };
}) {
  const [intro, setIntro] = useState(initial.intro);
  const [rows, setRows] = useState<AssignR[]>(
    initial.rows.map((r) => ({
      assignment: r.assignment,
      due: r.due,
      published: r.published !== false,
      active: r.active === true,
      opensAt: r.opensAt ?? "",
      closesAt: r.closesAt ?? "",
    })),
  );
  const [linkRow, setLinkRow] = useState<LinkRow>(toRow(initial.link));
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");
  const setRow = (i: number, patch: Partial<AssignR>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    touch();
  };

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        const clean = rows
          .map((r) => ({
            assignment: r.assignment.trim(),
            due: r.due.trim(),
            published: r.published,
            active: r.active,
            opensAt: r.active ? r.opensAt : "",
            closesAt: r.active ? r.closesAt : "",
          }))
          .filter((r) => r.assignment);
        save({ assignments: { intro: intro.trim(), rows: clean, link: fromRow(linkRow) } });
      }}
      id="assignments"
    >
      <SectionHeading title="Assignments" count={rows.length} />
      <p className={sectionLead}>
        The assignment names and due dates in the “Submit Assignments” table.
        Each one gets its own “Submit here” button automatically.
      </p>
      <div className="mt-4">
        <label className={labelClass}>Intro</label>
        <textarea
          rows={2}
          className={inputClass}
          value={intro}
          onChange={(e) => {
            setIntro(e.target.value);
            touch();
          }}
        />
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-md border border-neutral-200 p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
              <div>
                <label className={labelClass}>Assignment</label>
                <input
                  className={inputClass}
                  value={r.assignment}
                  onChange={(e) => setRow(i, { assignment: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Due date</label>
                <input
                  className={inputClass}
                  value={r.due}
                  placeholder="TBD"
                  onChange={(e) => setRow(i, { due: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <PublishToggle
                  checked={r.published}
                  onChange={(v) => setRow(i, { published: v })}
                />
                <ActivateToggle
                  checked={r.active}
                  onChange={(v) => setRow(i, { active: v })}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setRows((rs) => rs.filter((_, idx) => idx !== i));
                  touch();
                }}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Remove
              </button>
            </div>
            {r.active ? (
              <div className="mt-3 rounded-md bg-neutral-50 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Opens (optional)</label>
                    <input
                      type="datetime-local"
                      className={inputClass}
                      value={r.opensAt}
                      onChange={(e) => setRow(i, { opensAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Closes / deadline (optional)</label>
                    <input
                      type="datetime-local"
                      className={inputClass}
                      value={r.closesAt}
                      onChange={(e) => setRow(i, { closesAt: e.target.value })}
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  Los Angeles time. Leave blank for no limit. The “Submit here”
                  button is greyed out before the open time and after the
                  deadline.
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((rs) => [
            ...rs,
            {
              assignment: "",
              due: "TBD",
              published: true,
              active: false,
              opensAt: "",
              closesAt: "",
            },
          ]);
          touch();
        }}
        className={`${btnGhost} mt-3`}
      >
        + Add assignment
      </button>
      <div className="mt-4">
        <SingleLink
          title="Submit-assignments link"
          link={linkRow}
          onChange={(l) => {
            setLinkRow(l);
            touch();
          }}
        />
      </div>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

// ── Capstone ────────────────────────────────────────────────────────────────

export function CapstoneEditor({
  initial,
}: {
  initial: {
    intro: string;
    slideFlow: string[];
    guideLink: { label: string; href?: string };
    published?: boolean;
  };
}) {
  const [intro, setIntro] = useState(initial.intro);
  const [slideFlow, setSlideFlow] = useState<string[]>([...initial.slideFlow]);
  const [linkRow, setLinkRow] = useState<LinkRow>(toRow(initial.guideLink));
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        save({
          capstone: {
            intro: intro.trim(),
            slideFlow: slideFlow.map((s) => s.trim()).filter(Boolean),
            guideLink: fromRow(linkRow),
            // Capstone visibility is now controlled from the Page layout card.
            published: true,
          },
        });
      }}
      id="capstone"
    >
      <SectionHeading title="Capstone" count={slideFlow.length} />
      <p className={sectionLead}>
        The intro paragraph, the numbered recommended slide flow, and the guide
        link. Use the Page layout card at the top to show or hide this section.
      </p>
      <div className="mt-4">
        <label className={labelClass}>Intro</label>
        <textarea
          rows={3}
          className={inputClass}
          value={intro}
          onChange={(e) => {
            setIntro(e.target.value);
            touch();
          }}
        />
      </div>
      <div className="mt-4">
        <label className={labelClass}>Recommended slide flow</label>
        <div className="mt-1">
          <StringList
            items={slideFlow}
            onChange={(items) => {
              setSlideFlow(items);
              touch();
            }}
            addLabel="+ Add slide"
            placeholder="Slide…"
          />
        </div>
      </div>
      <div className="mt-4">
        <SingleLink
          title="Capstone guide link"
          link={linkRow}
          onChange={(l) => {
            setLinkRow(l);
            touch();
          }}
        />
      </div>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

// ── Contacts & addresses ────────────────────────────────────────────────────

type ContactR = {
  need: string;
  contact: string;
  use: string;
  email: string;
  phone: string;
  published: boolean;
};
type LocationR = { name: string; lines: string[] };

export function ContactsEditor({
  initial,
}: {
  initial: {
    rows: {
      need: string;
      contact: string;
      use: string;
      email?: string;
      phone?: string;
      published?: boolean;
    }[];
    locations: LocationR[];
  };
}) {
  const [rows, setRows] = useState<ContactR[]>(
    initial.rows.map((r) => ({
      need: r.need,
      contact: r.contact,
      use: r.use,
      email: r.email || "",
      phone: r.phone || "",
      published: r.published !== false,
    })),
  );
  const [locations, setLocations] = useState<LocationR[]>(
    initial.locations.map((l) => ({ name: l.name, lines: [...l.lines] })),
  );
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");
  const setRow = (i: number, patch: Partial<ContactR>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    touch();
  };
  const setLoc = (i: number, patch: Partial<LocationR>) => {
    setLocations((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    touch();
  };
  const dragRows = useDragReorder((from, to) => {
    setRows((rs) => reorder(rs, from, to));
    touch();
  });
  const dragLocs = useDragReorder((from, to) => {
    setLocations((ls) => reorder(ls, from, to));
    touch();
  });

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        const cleanRows = rows
          .map((r) => ({
            need: r.need.trim(),
            contact: r.contact.trim(),
            use: r.use.trim(),
            email: r.email.trim(),
            phone: r.phone.trim(),
            published: r.published,
          }))
          .filter((r) => r.need || r.contact || r.use || r.email || r.phone);
        const cleanLocs = locations
          .map((l) => ({
            name: l.name.trim(),
            lines: l.lines.map((x) => x.trim()).filter(Boolean),
          }))
          .filter((l) => l.name || l.lines.length);
        save({ contacts: { rows: cleanRows, locations: cleanLocs } });
      }}
      id="contacts"
    >
      <SectionHeading title="Contacts & addresses" count={rows.length} />
      <p className={sectionLead}>
        The “Important Contacts” table and the address cards beneath it.
      </p>
      <div className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            {...dragRows.rowProps(i)}
            className={`rounded-md border border-neutral-200 p-4 transition ${dragState(dragRows, i)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                <DragHandle {...dragRows.handleProps(i)} />
                Contact {i + 1}
              </span>
              <div className="flex items-center gap-3">
                <PublishToggle
                  checked={r.published}
                  onChange={(v) => setRow(i, { published: v })}
                />
                <button
                  type="button"
                  onClick={() => {
                    setRows((rs) => rs.filter((_, idx) => idx !== i));
                    touch();
                  }}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Need</label>
                <input
                  className={inputClass}
                  value={r.need}
                  onChange={(e) => setRow(i, { need: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Contact</label>
                <input
                  className={inputClass}
                  value={r.contact}
                  onChange={(e) => setRow(i, { contact: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Use for</label>
                <input
                  className={inputClass}
                  value={r.use}
                  onChange={(e) => setRow(i, { use: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Email address{" "}
                  <span className="font-normal text-neutral-400">(optional)</span>
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={r.email}
                  placeholder="name@usc.edu"
                  onChange={(e) => setRow(i, { email: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Phone number{" "}
                  <span className="font-normal text-neutral-400">(optional)</span>
                </label>
                <input
                  type="tel"
                  className={inputClass}
                  value={r.phone}
                  placeholder="(213) 555-0123"
                  onChange={(e) => setRow(i, { phone: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((rs) => [
            ...rs,
            { need: "", contact: "", use: "", email: "", phone: "", published: true },
          ]);
          touch();
        }}
        className={`${btnGhost} mt-3`}
      >
        + Add contact
      </button>

      <div className="mt-6 border-t border-neutral-200 pt-5">
        <h3 className="text-sm font-semibold text-neutral-800">Address cards</h3>
        <div className="mt-3 space-y-3">
          {locations.map((l, i) => (
            <div
              key={i}
              {...dragLocs.rowProps(i)}
              className={`rounded-md border border-neutral-200 p-4 transition ${dragState(dragLocs, i)}`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                  <DragHandle {...dragLocs.handleProps(i)} />
                  Location {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLocations((ls) => ls.filter((_, idx) => idx !== i));
                    touch();
                  }}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
              <div className="mt-3">
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={l.name}
                  onChange={(e) => setLoc(i, { name: e.target.value })}
                />
              </div>
              <div className="mt-2">
                <label className={labelClass}>Address lines</label>
                <div className="mt-1">
                  <StringList
                    items={l.lines}
                    onChange={(lines) => setLoc(i, { lines })}
                    addLabel="+ Add line"
                    placeholder="Street, city…"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setLocations((ls) => [...ls, { name: "", lines: [""] }]);
            touch();
          }}
          className={`${btnGhost} mt-3`}
        >
          + Add location
        </button>
      </div>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}

// ── CITI Training ───────────────────────────────────────────────────────────

export function CitiEditor({
  initial,
}: {
  initial: {
    body: string;
    links: { label: string; href?: string; published?: boolean }[];
  };
}) {
  const [body, setBody] = useState(initial.body);
  const [rows, setRows] = useState<QuickLinkRow[]>(
    initial.links.map((l) => ({
      label: l.label,
      href: l.href || "",
      published: l.published !== false,
    })),
  );
  const { status, error, setStatus, save } = useSaver();
  const touch = () => setStatus("idle");

  function update(i: number, patch: Partial<QuickLinkRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    touch();
  }
  const drag = useDragReorder((from, to) => {
    setRows((rs) => reorder(rs, from, to));
    touch();
  });

  return (
    <CollapsibleForm
      onSubmit={(e) => {
        e.preventDefault();
        const links = rows
          .map((r) => ({
            label: r.label.trim(),
            href: r.href.trim() || undefined,
            published: r.published,
          }))
          .filter((r) => r.label);
        save({ citi: { body: body.trim(), links } });
      }}
      id="citi"
    >
      <SectionHeading title="CITI Training" count={rows.length} />
      <p className={sectionLead}>
        The text and buttons in the “CITI Training” section. Separate paragraphs
        with a blank line. Each button can have its own web address — leave it
        blank to show a grey “soon” placeholder, and uncheck “Published” to hide
        a button without deleting it.
      </p>
      <div className="mt-4">
        <label className={labelClass}>Body text</label>
        <textarea
          rows={8}
          className={inputClass}
          value={body}
          placeholder="Write one or more paragraphs, separated by a blank line…"
          onChange={(e) => {
            setBody(e.target.value);
            touch();
          }}
        />
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            {...drag.rowProps(i)}
            className={`rounded-md border border-neutral-200 p-3 transition ${dragState(drag, i)}`}
          >
            <ReorderHeader handle={drag.handleProps(i)} index={i} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Button text</label>
                <input
                  className={inputClass}
                  value={r.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Web address{" "}
                  <span className="font-normal text-neutral-400">(optional)</span>
                </label>
                <input
                  className={inputClass}
                  value={r.href}
                  placeholder="https://…"
                  onChange={(e) => update(i, { href: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <PublishToggle
                checked={r.published}
                onChange={(v) => update(i, { published: v })}
              />
              <button
                type="button"
                onClick={() => {
                  setRows((rs) => rs.filter((_, idx) => idx !== i));
                  touch();
                }}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setRows((rs) => [...rs, { label: "", href: "", published: true }]);
          touch();
        }}
        className={`${btnGhost} mt-3`}
      >
        + Add button
      </button>
      <SaveBar status={status} error={error} />
    </CollapsibleForm>
  );
}
