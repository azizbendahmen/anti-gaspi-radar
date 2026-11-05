import { freshnessTone } from "@/lib/pricing";

const toneVar = { radar: "var(--radar)", amber: "var(--amber)", coral: "var(--coral)" };

export function FreshnessGauge({ score, size = 56 }: { score: number; size?: number }) {
  const r = 22, c = 2 * Math.PI * r;
  const color = toneVar[freshnessTone(score)];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Score de fraîcheur ${score} sur 100`}>
      <svg viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--muted)" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: "stroke-dashoffset .8s" }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-sm font-semibold" style={{ color }}>{score}</span>
    </div>
  );
}
