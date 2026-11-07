import { motion } from "framer-motion";
import type { PricedLot } from "@/services/api";
import { freshnessTone } from "@/lib/pricing";

const toneVar = { radar: "var(--radar)", amber: "var(--amber)", coral: "var(--coral)" };

interface Props {
  lots?: PricedLot[];
  size?: number | string;
  onSelect?: (id: string) => void;
  selected?: string | undefined;
  className?: string;
  showLabels?: boolean;
}

/** Signature radar: distance from centre = time left before closing, colour = freshness. */
export function Radar({ lots = [], size = "100%", onSelect, selected, className, showLabels }: Props) {
  const maxMin = 240;
  return (
    <div className={className} style={{ width: size, aspectRatio: "1" }}>
      <svg viewBox="-110 -110 220 220" className="h-full w-full overflow-visible" role="img" aria-label="Radar des paniers : plus un point est proche du centre, plus la fermeture est proche">
        <defs>
          <radialGradient id="rg-bg">
            <stop offset="0%" stopColor="var(--radar)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--radar)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rg-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--radar)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--radar)" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <circle r="100" fill="url(#rg-bg)" />
        {[25, 50, 75, 100].map((r) => (
          <circle key={r} r={r} fill="none" stroke="var(--radar)" strokeOpacity={0.18} strokeWidth={0.4} />
        ))}
        <line x1="-100" x2="100" stroke="var(--radar)" strokeOpacity=".12" strokeWidth=".4" />
        <line y1="-100" y2="100" stroke="var(--radar)" strokeOpacity=".12" strokeWidth=".4" />
        {showLabels && [60, 120, 180, 240].map((m, i) => (
          <text key={m} x={2} y={-(i + 1) * 25 + 4} fontSize="4" fill="var(--radar)" fillOpacity=".55" fontFamily="var(--font-mono)">{m / 60}h</text>
        ))}
        <g className="animate-sweep">
          <path d="M0 0 L100 0 A100 100 0 0 0 70.7 -70.7 Z" fill="url(#rg-beam)" />
          <line x1="0" y1="0" x2="100" y2="0" stroke="var(--radar)" strokeWidth=".8" />
        </g>
        {lots.map((l, i) => {
          const r = 12 + Math.min(1, l.minutesToClose / maxMin) * 85;
          const a = (l.angle * Math.PI) / 180;
          const x = Math.cos(a) * r, y = Math.sin(a) * r;
          const c = l.blocked ? "var(--muted-foreground)" : toneVar[freshnessTone(l.score)];
          const isSel = selected === l.id;
          return (
            <motion.g key={l.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.15 }}
              style={{ cursor: onSelect ? "pointer" : undefined }} onClick={() => onSelect?.(l.id)}
              role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} aria-label={`${l.merchant}, ${Math.round(l.minutesToClose)} minutes restantes`}
              onKeyDown={(e) => e.key === "Enter" && onSelect?.(l.id)}>
              <circle cx={x} cy={y} r={3} fill={c} className="animate-ping-blip" style={{ animationDelay: `${i * 0.4}s` }} />
              <circle cx={x} cy={y} r={isSel ? 4.5 : 3} fill={c} stroke={isSel ? "var(--foreground)" : "none"} strokeWidth={0.8} />
              {showLabels && <text x={x + 6} y={y + 1.5} fontSize="4.5" fill="var(--foreground)" fillOpacity=".8">{l.merchant.split(" ")[0]}</text>}
            </motion.g>
          );
        })}
        <circle r="2" fill="var(--radar)" />
      </svg>
    </div>
  );
}

export function RadarLoader({ label = "Balayage en cours…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
      <Radar size={96} />
      <span className="font-mono text-xs">{label}</span>
    </div>
  );
}
