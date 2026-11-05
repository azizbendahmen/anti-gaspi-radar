import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Radar, RadarLoader } from "@/components/Radar";
import { FreshnessGauge } from "@/components/FreshnessGauge";
import { CATEGORIES, getLots, isAvailable, reserveLot, clientId, type Category, type PricedLot } from "@/services/api";
import { useLive, useHydrated } from "@/hooks/use-api";
import { tnd } from "@/lib/pricing";

export const Route = createFileRoute("/etudiant")({
  head: () => ({
    meta: [
      { title: "Paniers à sauver près de vous — Food Waste Radar" },
      { name: "description", content: "Réservez des paniers d'invendus à prix dynamique, retrait par QR code." },
      { property: "og:title", content: "Vue étudiant — Food Waste Radar" },
      { property: "og:description", content: "Radar des paniers d'invendus disponibles maintenant." },
    ],
  }),
  component: Student,
});

function countdown(mins: number) {
  const h = Math.floor(mins / 60), m = Math.floor(mins % 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

function Student() {
  const hydrated = useHydrated();
  const lots = useLive(getLots);
  const [view, setView] = useState<"radar" | "liste">("radar");
  const [cat, setCat] = useState<Category | "Tout">("Tout");
  const [sel, setSel] = useState<string>();
  const filtered = lots.filter((l) => cat === "Tout" || l.category === cat);
  const selected = filtered.find((l) => l.id === sel);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-radar">Vue étudiant</p>
          <h1 className="text-4xl font-light md:text-5xl">Paniers en vue</h1>
        </div>
        <div className="flex rounded-full border border-border p-1 text-sm" role="tablist">
          {(["radar", "liste"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-full px-4 py-1.5 capitalize transition-colors ${view === v ? "bg-radar text-primary-foreground" : "text-muted-foreground"}`}>{v}</button>
          ))}
        </div>
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {(["Tout", ...CATEGORIES] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${cat === c ? "border-radar text-radar" : "border-border text-muted-foreground hover:text-foreground"}`}>{c}</button>
        ))}
      </div>

      {!hydrated ? <RadarLoader /> : view === "radar" ? (
        <div className="grid gap-6 md:grid-cols-[1fr_380px]">
          <div className="mx-auto w-full max-w-[520px]">
            <Radar lots={filtered} onSelect={setSel} selected={sel} showLabels />
            <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">Touchez un point · centre = fermeture imminente</p>
          </div>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <LotCard lot={selected} />
              </motion.div>
            ) : (
              <div className="panel grid place-items-center p-8 text-center text-muted-foreground">Sélectionnez un signal sur le radar pour voir le panier.</div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <LotCard lot={l} />
            </motion.div>
          ))}
          {!filtered.length && <p className="text-muted-foreground">Aucun panier dans cette catégorie pour l'instant.</p>}
        </div>
      )}
    </main>
  );
}

function LotCard({ lot }: { lot: PricedLot }) {
  const navigate = useNavigate();
  const [err, setErr] = useState<string>();
  const me = clientId();
  const available = isAvailable(lot, me);
  const mine = lot.reservedBy === me && lot.reservedUntil;

  async function reserve() {
    const r = await reserveLot(lot.id);
    if (!r.ok) return setErr(r.reason);
    navigate({ to: "/reservation/$id", params: { id: lot.id } });
  }

  return (
    <article className={`panel flex h-full flex-col gap-4 p-5 transition-colors hover:border-radar/40 ${lot.blocked ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{lot.category}</p>
          <h3 className="text-xl leading-tight">{lot.merchant}</h3>
          <p className="text-xs text-muted-foreground">{lot.address}</p>
        </div>
        <FreshnessGauge score={lot.score} />
      </div>
      <p className="text-sm">{lot.contents}</p>
      <div className="flex justify-between font-mono text-xs text-muted-foreground">
        <span>{(lot.weight_g / 1000).toFixed(2).replace(".", ",")} kg</span>
        <span className={lot.minutesToClose < 60 ? "text-coral" : ""}>ferme dans {countdown(lot.minutesToClose)}</span>
      </div>
      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground line-through">{tnd(lot.basePrice)}</span>
          <span className="font-display text-3xl text-radar">{tnd(lot.price)}</span>
        </div>
        {lot.blocked ? (
          <span className="rounded-full border border-coral/50 px-3 py-1.5 text-xs text-coral">Bloqué</span>
        ) : mine ? (
          <button className="btn-ghost !py-2" onClick={() => navigate({ to: "/reservation/$id", params: { id: lot.id } })}>Mon QR</button>
        ) : (
          <button className="btn-radar !py-2" disabled={!available} onClick={reserve}>{available ? "Réserver" : "Réservé"}</button>
        )}
      </div>
      {err && <p role="alert" className="text-xs text-coral">{err}</p>}
    </article>
  );
}
