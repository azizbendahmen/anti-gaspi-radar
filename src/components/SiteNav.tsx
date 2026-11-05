import { Link } from "@tanstack/react-router";
import { SIMULATED } from "@/services/api";

const links = [
  { to: "/etudiant", label: "Étudiant" },
  { to: "/commercant", label: "Commerçant" },
  { to: "/a-propos", label: "Le projet" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="relative grid h-7 w-7 place-items-center rounded-full border border-radar/50">
            <span className="h-1.5 w-1.5 rounded-full bg-radar glow" />
          </span>
          <span className="font-display text-lg">Food Waste <em className="text-radar">Radar</em></span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "rounded-full px-3 py-1.5 bg-secondary text-foreground" }}>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      {SIMULATED && (
        <div className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-full border border-amber/40 bg-background/90 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-amber">
          ● Données simulées
        </div>
      )}
    </header>
  );
}
