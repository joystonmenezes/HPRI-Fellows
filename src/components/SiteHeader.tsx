import { program } from "@/content/program";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 shadow-md">
      <div className="bg-cardinal text-white">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3">
          <a href="#top" className="flex items-baseline gap-2">
            <span className="font-serif text-xl font-bold tracking-tight">USC</span>
            <span className="hidden text-sm font-semibold text-gold sm:inline">
              HPRI Summer Fellowship
            </span>
          </a>
          <span className="hidden text-xs text-white/80 md:inline">
            {program.term} &middot; {program.dateRange}
          </span>
        </div>
      </div>
    </header>
  );
}
