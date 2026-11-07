import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig, animate } from "framer-motion";
import { DndContext, useDraggable, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { QRCodeSVG } from "qrcode.react";
import { useBoxWorkshop, FAMILIES, PHASE_STATES, verdict, type ItemDef, type Workshop } from "@/hooks/use-box-workshop";
import { BoxScene } from "./BoxScene";
import { ItemShape } from "./shapes";
import { FreshnessGauge } from "@/components/FreshnessGauge";
import { tnd } from "@/lib/pricing";

const hhmm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function BoxWorkshop() {
  const w = useBoxWorkshop();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }), useSensor(KeyboardSensor));
  const onDragEnd = (e: DragEndEvent) => { if (e.over?.id === "plate") w.addItem(e.active.data.current as ItemDef); };
  const composing = w.state === "IDLE" || w.state === "COMPOSING";
  const measuring = PHASE_STATES.includes(w.state as never) || w.state === "DOOR_CLOSING";

  return (
    <MotionConfig reducedMotion="user">
      <section className="panel overflow-hidden p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-radar">Atelier de la box</p>
            <h2 className="text-3xl">Préparez un panier</h2>
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <span className="text-muted-foreground">Mode démo accéléré</span>
            <button role="switch" aria-checked={w.demo} disabled={measuring} onClick={() => w.setDemo(!w.demo)}
              className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${w.demo ? "bg-radar" : "bg-muted"}`}>
              <motion.span layout className={`absolute top-1 h-5 w-5 rounded-full bg-background ${w.demo ? "right-1" : "left-1"}`} />
            </button>
          </label>
        </div>

        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid gap-5 lg:grid-cols-[220px_1fr_280px]">
            <Drawer w={w} disabled={!composing} />
            <div className="flex flex-col gap-4">
              <BoxScene w={w} />
              {composing && (
                <button className="btn-radar mx-auto min-h-12 px-8 text-base" disabled={!w.plate.length} onClick={w.run}>Placer dans la box ↓</button>
              )}
              {measuring && <Analysis w={w} />}
              {w.state === "DOOR_REOPENED" && (
                <Notice tone="coral" title="Porte ouverte : mesure annulée" text="L'air extérieur fausse la mesure. Refermez la porte et on recommence.">
                  <button className="btn-radar min-h-12" onClick={w.run}>Recommencer</button>
                  <button className="btn-ghost min-h-12" onClick={w.reset}>Annuler le lot</button>
                </Notice>
              )}
              {w.state === "SENSOR_OFFLINE" && (
                <Notice tone="amber" title="La box ne répond pas" text="Les capteurs semblent hors ligne. Vous pouvez continuer en mode simulation.">
                  <button className="btn-radar min-h-12" onClick={() => { w.useSimulation(); setTimeout(w.run, 0); }}>Passer en simulation</button>
                  <button className="btn-ghost min-h-12" onClick={w.reset}>Annuler</button>
                </Notice>
              )}
              {w.state === "RESULTS" && <Results w={w} />}
              {w.state === "PUBLISHED" && <Published w={w} />}
            </div>
            <IdCard w={w} />
          </div>
        </DndContext>

        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Options de test</summary>
          <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={w.simulateOffline} onChange={(e) => w.setSimulateOffline(e.target.checked)} /> Simuler une box hors ligne</label>
          <p className="mt-1">Durées réelles : purge 45 s, accumulation 4 min.</p>
        </details>
      </section>
    </MotionConfig>
  );
}

function Drawer({ w, disabled }: { w: Workshop; disabled: boolean }) {
  return (
    <aside className={`flex flex-col gap-3 ${disabled ? "pointer-events-none opacity-40" : ""}`} aria-label="Tiroir à produits">
      <div className="flex flex-wrap gap-1.5">
        {FAMILIES.map((f) => (
          <button key={f.key} onClick={() => w.chooseFamily(f)} className={`min-h-10 rounded-full border px-3 text-sm ${w.family.key === f.key ? "border-radar text-radar" : "border-border text-muted-foreground"}`}>{f.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {w.family.items.map((it) => <DraggableItem key={it.id} item={it} onAdd={() => w.addItem(it)} />)}
      </div>
      <p className="text-xs text-muted-foreground">Glissez vers l'assiette, ou touchez pour ajouter.</p>
    </aside>
  );
}

function DraggableItem({ item, onAdd }: { item: ItemDef; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id, data: item });
  return (
    <button ref={setNodeRef} {...listeners} {...attributes} onClick={onAdd} aria-label={`Ajouter ${item.name}`}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, zIndex: isDragging ? 50 : undefined }}
      className={`flex min-h-14 touch-none items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-left transition-shadow hover:border-radar/50 ${isDragging ? "glow" : ""}`}>
      <ItemShape kind={item.kind} size={36} />
      <span className="text-sm leading-tight">{item.name}<br /><span className="font-mono text-xs text-muted-foreground">~{item.grams} g</span></span>
    </button>
  );
}

function IdCard({ w }: { w: Workshop }) {
  return (
    <aside className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Carte d'identité du lot</p>
      <h3 className="text-xl leading-tight">{w.lotName}</h3>
      <ul className="space-y-1 text-sm">
        {Object.values(w.counts).map((c) => (
          <motion.li layout key={c.def.id} className="flex justify-between"><span>{c.def.name}</span><span className="font-mono text-radar">×{c.n}</span></motion.li>
        ))}
        {!w.plate.length && <li className="text-muted-foreground">Assiette vide</li>}
      </ul>
      <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
        <dt className="text-muted-foreground">Poids estimé</dt><dd className="text-right font-mono">{w.estimatedWeight} g</dd>
        <dt className="text-muted-foreground">Prix de base</dt><dd className="text-right font-mono">{tnd(w.basePrice)}</dd>
        <dt className="text-muted-foreground">Production</dt><dd className="text-right font-mono">{hhmm(w.producedAt)}</dd>
        <dt className="text-muted-foreground">Fermeture</dt><dd className="text-right font-mono">{hhmm(w.closesAt)}</dd>
      </dl>
    </aside>
  );
}

const PHASE_INFO: Record<string, { label: string; icon: (active: boolean) => React.ReactElement }> = {
  STABILIZING: { label: "Stabilisation", icon: () => <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg> },
  WEIGHING: { label: "Pesée", icon: () => <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M5 7h14M5 7l-3 7h6zM19 7l-3 7h6zM8 21h8" /></svg> },
  PURGING: { label: "Purge de l'air", icon: (a) => <motion.svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" animate={a ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}><circle cx="12" cy="12" r="2" />{[0, 120, 240].map((r) => <ellipse key={r} cx="12" cy="6" rx="2.5" ry="5" transform={`rotate(${r} 12 12)`} />)}</motion.svg> },
  ACCUMULATING: { label: "Accumulation des gaz", icon: () => <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="14" r="3" /><circle cx="16" cy="9" r="3" /><circle cx="17" cy="18" r="2" /><path d="M9.5 12.5 13.5 10.5M15.5 16l.7-4" /></svg> },
  ANALYZING: { label: "Analyse du score", icon: () => <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 12l6-6" /></svg> },
};

function Analysis({ w }: { w: Workshop }) {
  const activeIdx = PHASE_STATES.indexOf(w.state as never);
  const pct = w.state === "DOOR_CLOSING" ? 0 : 1 - w.progress.remaining / w.progress.total;
  const C = 2 * Math.PI * 52;
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-background/50 p-4">
      <ol className="flex w-full justify-between gap-1">
        {PHASE_STATES.map((p, i) => {
          const done = i < activeIdx, active = i === activeIdx;
          return (
            <li key={p} className={`flex flex-1 flex-col items-center gap-1 text-center ${active ? "text-radar" : done ? "text-foreground" : "text-muted-foreground/50"}`}>
              <motion.span animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={{ repeat: active ? Infinity : 0, duration: 1.4 }}
                className={`grid h-11 w-11 place-items-center rounded-full border ${active ? "border-radar bg-radar/10" : done ? "border-radar/40" : "border-border"}`}>
                {done ? <svg viewBox="0 0 24 24" className="h-5 w-5 text-radar" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg> : PHASE_INFO[p].icon(active)}
              </motion.span>
              <span className="hidden text-[11px] leading-tight sm:block">{PHASE_INFO[p].label}</span>
            </li>
          );
        })}
      </ol>
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--muted)" strokeWidth="8" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--radar)" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset .25s linear" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl tabular-nums">{w.state === "DOOR_CLOSING" ? "··" : `${Math.ceil(w.progress.remaining)}s`}</span>
          <span className="text-xs text-muted-foreground">{activeIdx >= 0 ? PHASE_INFO[w.state].label : "Fermeture"}</span>
          {activeIdx >= 0 && <span className="font-mono text-[10px] text-muted-foreground">total {Math.ceil(w.progress.totalRemaining)} s</span>}
        </div>
      </div>
      <button className="btn-ghost min-h-11 text-sm" onClick={w.openDoor} disabled={w.state === "DOOR_CLOSING"}>Ouvrir la porte</button>
    </div>
  );
}

function Notice({ tone, title, text, children }: { tone: "coral" | "amber"; title: string; text: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} role="alert"
      className={`flex flex-col items-center gap-3 rounded-xl border p-5 text-center ${tone === "coral" ? "border-coral/50 bg-coral/10" : "border-amber/50 bg-amber/10"}`}>
      <p className={`font-display text-2xl ${tone === "coral" ? "text-coral" : "text-amber"}`}>{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </motion.div>
  );
}

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const c = animate(0, to, { duration: 1.4, onUpdate: (n) => { if (ref.current) ref.current.textContent = `${Math.round(n)}${suffix}`; } });
    return () => c.stop();
  }, [to, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

function FlipCard({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ rotateY: 90, opacity: 0, y: -20 }} animate={{ rotateY: 0, opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.45, type: "spring", stiffness: 120, damping: 16 }}
      style={{ transformPerspective: 800 }} className="rounded-xl border border-border bg-background/70 p-4">
      {children}
    </motion.div>
  );
}

function Results({ w }: { w: Workshop }) {
  const r = w.result!;
  const [why, setWhy] = useState(false);
  const diff = Math.abs(r.weight_g - w.estimatedWeight) / Math.max(1, w.estimatedWeight);
  const cold = r.maxTemp <= 6;
  const v = verdict(w.score, w.blocked);
  const ttPart = Math.min(60, r.degreeHours * 1.5), gasPart = Math.min(40, r.gasDropPct * 0.8);
  const toneCls = { radar: "text-radar border-radar", amber: "text-amber border-amber", coral: "text-coral border-coral" }[v.tone];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FlipCard i={0}>
          <p className="text-xs text-muted-foreground">Poids mesuré</p>
          <p className="font-mono text-3xl text-radar"><CountUp to={r.weight_g} suffix=" g" /></p>
          <p className="text-xs text-muted-foreground">estimé : {w.estimatedWeight} g</p>
          {diff > 0.15 && <p className="mt-2 text-xs text-amber">Écart de {Math.round(diff * 100)} % avec votre estimation. Vérifiez le contenu ?</p>}
        </FlipCard>
        <FlipCard i={1}>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 20 60" className="h-16 w-6">
              <rect x="7" y="4" width="6" height="42" rx="3" fill="var(--muted)" />
              <motion.rect x="7" width="6" rx="3" fill={cold ? "var(--radar)" : "var(--coral)"} initial={{ y: 46, height: 0 }} animate={{ y: 46 - Math.min(40, r.maxTemp * 4), height: Math.min(40, r.maxTemp * 4) }} transition={{ delay: 1.2, duration: 1 }} />
              <circle cx="10" cy="52" r="6" fill={cold ? "var(--radar)" : "var(--coral)"} />
            </svg>
            <div>
              <p className="font-mono text-2xl">{r.temp.toFixed(1)} °C</p>
              <p className="font-mono text-xs text-muted-foreground">humidité {r.hum} % · max {r.maxTemp} °C</p>
              <p className={`mt-1 text-xs ${cold ? "text-radar" : "text-coral"}`}>{cold ? "Chaîne du froid respectée" : "Dépassement détecté"}</p>
            </div>
          </div>
        </FlipCard>
        <FlipCard i={2}>
          <div className="flex items-center gap-4">
            <FreshnessGauge score={w.score} size={72} />
            <div>
              <p className="text-xs text-muted-foreground">Fraîcheur</p>
              <p className={`font-display text-2xl ${toneCls.split(" ")[0]}`}>{v.label}</p>
            </div>
          </div>
          <button className="mt-2 text-xs text-radar underline-offset-2 hover:underline" onClick={() => setWhy(!why)} aria-expanded={why}>Pourquoi ce score ?</button>
          <AnimatePresence>
            {why && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden text-xs">
                <p className="mt-2 font-mono">temps-température : −{ttPart.toFixed(0)} pts ({r.degreeHours} °C·h)</p>
                <p className="font-mono">variation de gaz : −{gasPart.toFixed(0)} pts ({r.gasDropPct} %)</p>
                <p className="mt-1 text-muted-foreground">Le capteur de gaz voit les odeurs, pas le rassissement du pain : le temps-température reste le critère principal.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </FlipCard>
        <FlipCard i={3}>
          <div className="relative">
            <p className="text-xs text-muted-foreground">Étiquette prix</p>
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground line-through">{tnd(w.basePrice)}</span>
              <span className="font-display text-4xl text-radar">{tnd(w.finalPrice)}</span>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">{tnd(w.basePrice)} × {w.calc.ff.toFixed(2)} × {w.calc.tf.toFixed(2)} = {w.calc.raw.toFixed(2)} · plancher {tnd(w.calc.floor)} · arrondi 0,5</p>
            <motion.div initial={{ scale: 3, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 0.9, rotate: -12 }} transition={{ delay: 2.6, type: "spring", stiffness: 300, damping: 12 }}
              className={`pointer-events-none absolute -right-1 -top-1 rounded-md border-2 px-2 py-1 font-mono text-[11px] font-bold tracking-wider ${toneCls}`}>
              {v.stamp}
            </motion.div>
          </div>
        </FlipCard>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.9 }} className="flex flex-col gap-3 rounded-xl border border-border p-4">
        {w.blocked ? (
          <p role="alert" className="text-sm text-coral">Publication impossible : ce lot a passé trop de temps au chaud ({r.degreeHours} °C·h). Par sécurité, il ne peut pas être vendu.</p>
        ) : (
          <label className="text-sm">
            <span className="flex justify-between"><span>Ajuster le prix</span><span className="font-mono text-radar">{tnd(w.finalPrice)}</span></span>
            <input type="range" className="mt-2 w-full accent-[var(--radar)]" min={Math.ceil(w.calc.floor * 2) / 2} max={w.basePrice} step={0.5}
              value={w.finalPrice} onChange={(e) => w.setPriceOverride(+e.target.value)} />
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="btn-radar min-h-12" disabled={w.blocked} onClick={w.publish}>Valider et publier</button>
          <button className="btn-ghost min-h-12" onClick={w.run}>Refaire la mesure</button>
          <button className="btn-ghost min-h-12" onClick={w.reset}>Annuler le lot</button>
        </div>
      </motion.div>
    </div>
  );
}

function Published({ w }: { w: Workshop }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative flex flex-col items-center gap-4 overflow-hidden rounded-xl border border-radar/40 p-6 text-center">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-radar"
          initial={{ scale: 0.2, opacity: 0.8 }} animate={{ scale: 5, opacity: 0 }} transition={{ delay: i * 0.4, duration: 2 }} />
      ))}
      <p className="font-display text-3xl text-radar">Signal envoyé !</p>
      <p className="text-sm text-muted-foreground">Le lot {w.publishedId} est visible sur le radar des étudiants à {tnd(w.finalPrice)}.</p>
      <div className="rounded-lg bg-foreground p-3"><QRCodeSVG value={`FWR-LOT:${w.publishedId}`} size={120} bgColor="transparent" fgColor="var(--background)" /></div>
      <button className="btn-radar min-h-12" onClick={w.reset}>Nouveau lot</button>
    </motion.div>
  );
}
