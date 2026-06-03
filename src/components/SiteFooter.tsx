import { program } from "@/content/program";

export function SiteFooter() {
  return (
    <footer className="bg-cardinal text-white">
      <div className="mx-auto max-w-content px-4 py-8">
        <p className="font-serif text-lg font-bold">{program.name}</p>
        <p className="mt-1 text-sm text-white/80">
          {program.term} &middot; {program.dateRange}
        </p>
        <div className="mt-5 grid gap-4 text-sm text-white/80 sm:grid-cols-2">
          {program.contacts.locations.map((loc) => (
            <div key={loc.name}>
              <p className="font-semibold text-gold">{loc.name}</p>
              {loc.lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-6 border-t border-white/20 pt-4 text-xs text-white/60">
          &copy; {new Date().getFullYear()} HPRI Summer Fellows Program. For
          program questions, contact Amy Stein, Program Administrator.
        </p>
      </div>
    </footer>
  );
}
