import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence, useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Radar } from "@/components/Radar";
import { FreshnessGauge } from "@/components/FreshnessGauge";
import { getLots } from "@/services/api";
import { useLive, useHydrated } from "@/hooks/use-api";
import { dynamicPrice, freshnessScore, tnd } from "@/lib/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Food Waste Radar — Chaque repas sauvé est un signal" },
      { name: "description", content: "Une boîte connectée ESP32 et un prix dynamique pour sauver les invendus alimentaires en Tunisie." },
      { property: "og:title", content: "Food Waste Radar" },
      { property: "og:description", content: "Boîte connectée, score de fraîcheur hybride et prix dynamique en TND." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <FreshnessLab />
      <Impact />
      <Architecture />
      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        Food Waste Radar — prototype académique · Tunis
      </footer>
    </main>
  );
}

function Hero() {
  const hydrated = useHydrated();
  const lots = useLive(getLots);
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid min-h-[calc(100svh-57px)] max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.25em] text-radar">IoT · anti-gaspillage · Tunis</p>
          <h1 className="text-5xl leading-[0.95] font-light md:text-7xl">
            Chaque repas sauvé est un <em className="text-radar text-glow">signal.</em>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Une boîte connectée pèse, sent et mesure les invendus. Le prix baisse avec la fraîcheur et l'heure de fermeture. Les étudiants les captent sur le radar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/etudiant" className="btn-radar">Voir la démo étudiant →</Link>
            <Link to="/commercant" className="btn-ghost">Tableau de bord commerçant</Link>
          </div>
          <div className="mt-10 flex gap-6 font-mono text-xs text-muted-foreground">
            <Legend c="bg-radar" t="frais" /><Legend c="bg-amber" t="à consommer vite" /><Legend c="bg-coral" t="dernier appel" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2 }} className="relative mx-auto w-full max-w-[560px]">
          <Radar lots={hydrated ? lots : []} showLabels />
          <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">centre = fermeture imminente · {lots.length} paniers détectés</p>
        </motion.div>
      </div>
    </section>
  );
}

function Legend({ c, t }: { c: string; t: string }) {
  return <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${c}`} />{t}</span>;
}

function SectionHead({ k, title, sub }: { k: string; title: string; sub?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-radar">{k}</p>
      <h2 className="text-4xl font-light md:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-muted-foreground">{sub}</p>}
    </div>
  );
}

const SENSORS = [
  { id: "load", x: 160, y: 232, name: "Cellule de charge + HX711", does: "Pèse le contenu au gramme près : l'inventaire se met à jour quand un article est retiré.", not: "Ne sait pas quel article a été pris, seulement combien de grammes ont disparu." },
  { id: "bme", x: 245, y: 70, name: "BME680", does: "Température, humidité et résistance de gaz (composés organiques volatils).", not: "Ne mesure pas une molécule précise ; sa valeur absolue dérive, seule la variation est exploitable." },
  { id: "mq", x: 85, y: 70, name: "MQ-135", does: "Second capteur de gaz pour comparer et confirmer les tendances du BME680.", not: "Peu sélectif et sensible à l'humidité : ce n'est pas un détecteur de pourriture." },
  { id: "ds", x: 60, y: 165, name: "DS18B20", does: "Sonde de température étanche et fiable, base du calcul des degrés-heures.", not: "Mesure l'air de la boîte, pas le cœur des aliments." },
  { id: "reed", x: 300, y: 135, name: "Capteur d'ouverture (reed)", does: "Détecte chaque ouverture de porte et sa durée.", not: "Ne sait pas qui a ouvert ni pourquoi." },
  { id: "fan", x: 170, y: 42, name: "Ventilateur de purge", does: "Renouvelle l'air avant chaque cycle de mesure pour repartir d'une base propre.", not: "N'est pas un système de réfrigération." },
];

function HowItWorks() {
  const [sel, setSel] = useState(SENSORS[0]!);
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <SectionHead k="01 — Comment ça marche" title="Une boîte qui pèse, sent et se souvient." sub="Cliquez sur chaque capteur. Nous disons aussi ce qu'il ne sait pas faire." />
      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <div className="panel p-4">
          <svg viewBox="0 0 340 280" className="w-full" role="group" aria-label="Coupe de la boîte connectée">
            <rect x="30" y="30" width="280" height="225" rx="12" fill="var(--background)" stroke="var(--radar)" strokeOpacity=".4" />
            <rect x="290" y="60" width="20" height="160" fill="var(--muted)" stroke="var(--radar)" strokeOpacity=".3" />
            <rect x="60" y="215" width="200" height="12" rx="3" fill="var(--muted)" />
            <rect x="80" y="155" width="160" height="58" rx="10" fill="var(--secondary)" stroke="var(--amber)" strokeOpacity=".5" strokeDasharray="3 3" />
            <text x="160" y="189" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">panier d'invendus</text>
            <rect x="140" y="252" width="60" height="16" rx="3" fill="var(--secondary)" stroke="var(--radar)" strokeOpacity=".4" />
            <text x="170" y="263" textAnchor="middle" fontSize="7" fill="var(--radar)" fontFamily="var(--font-mono)">ESP32</text>
            {SENSORS.map((s) => (
              <g key={s.id} onClick={() => setSel(s)} onKeyDown={(e) => e.key === "Enter" && setSel(s)} tabIndex={0} role="button" aria-label={s.name} className="cursor-pointer focus:outline-none">
                <circle cx={s.x} cy={s.y} r="12" fill="var(--radar)" fillOpacity={sel.id === s.id ? 0.25 : 0.08} className={sel.id === s.id ? "" : "animate-ping-blip"} />
                <circle cx={s.x} cy={s.y} r="5" fill={sel.id === s.id ? "var(--radar)" : "var(--foreground)"} />
              </g>
            ))}
          </svg>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={sel.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="panel flex flex-col gap-5 p-6">
            <h3 className="text-3xl">{sel.name}</h3>
            <div>
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-radar">Ce qu'il mesure</p>
              <p>{sel.does}</p>
            </div>
            <div className="rounded-lg border border-coral/30 bg-coral/5 p-4">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-coral">Ce qu'il ne mesure pas</p>
              <p className="text-muted-foreground">{sel.not}</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              {SENSORS.map((s) => (
                <button key={s.id} onClick={() => setSel(s)} className={`rounded-full border px-3 py-1 text-xs transition-colors ${s.id === sel.id ? "border-radar text-radar" : "border-border text-muted-foreground hover:text-foreground"}`}>{s.name.split(" ")[0]}</button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function FreshnessLab() {
  const [dh, setDh] = useState(8);
  const [gas, setGas] = useState(10);
  const [mins, setMins] = useState(90);
  const base = 15;
  const score = freshnessScore(dh, gas);
  const p = dynamicPrice(base, score, mins);
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <SectionHead k="02 — Score de fraîcheur" title="Hybride : le temps-température, puis le gaz." sub="Les degrés-heures au-dessus de 4 °C pèsent jusqu'à 60 points ; la chute de résistance de gaz jusqu'à 40. Bougez les curseurs." />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="panel space-y-7 p-6">
          <Slider label="Degrés-heures accumulés" unit="°C·h" v={dh} set={setDh} max={40} />
          <Slider label="Chute de résistance de gaz" unit="%" v={gas} set={setGas} max={50} />
          <Slider label="Temps avant fermeture" unit="min" v={mins} set={setMins} max={240} />
        </div>
        <div className="panel flex flex-col gap-6 p-6">
          <div className="flex items-center gap-5">
            <FreshnessGauge score={score} size={96} />
            <div>
              <p className="text-sm text-muted-foreground">Score de fraîcheur</p>
              <p className="font-display text-3xl">{score >= 70 ? "Frais" : score >= 40 ? "À consommer vite" : "Dernier appel"}</p>
            </div>
          </div>
          <div className="font-mono text-sm leading-7">
            <p className="text-muted-foreground">prix = base × fraîcheur × temps</p>
            <p>{tnd(base)} × {p.ff.toFixed(2)} × {p.tf.toFixed(2)} = {p.raw.toFixed(2)}</p>
            <p className="text-muted-foreground">plancher 30 % = {tnd(p.floor)} · arrondi 0,5</p>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-muted-foreground line-through">{tnd(base)}</span>
            <motion.span key={p.price} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-5xl text-radar">{tnd(p.price)}</motion.span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slider({ label, unit, v, set, max }: { label: string; unit: string; v: number; set: (n: number) => void; max: number }) {
  return (
    <label className="block">
      <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="font-mono text-radar">{v} {unit}</span></div>
      <input type="range" min={0} max={max} value={v} onChange={(e) => set(+e.target.value)} className="w-full accent-[var(--radar)]" />
    </label>
  );
}

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const c = animate(0, to, { duration: 2, onUpdate: (n) => { if (ref.current) ref.current.textContent = Math.round(n).toLocaleString("fr-FR") + suffix; } });
    return () => c.stop();
  }, [inView, to, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

function Impact() {
  const stats = [
    { n: 1284, s: " kg", l: "de nourriture sauvée" },
    { n: 3170, s: "", l: "repas redistribués" },
    { n: 21450, s: " TND", l: "économisés par les étudiants" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <SectionHead k="03 — Impact" title="Ce que le radar a capté." />
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.l} className="panel p-6">
            <p className="font-display text-5xl text-radar"><Counter to={s.n} suffix={s.s} /></p>
            <p className="mt-2 text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-amber">Données simulées — projection sur un semestre pilote, pas des mesures réelles.</p>
    </section>
  );
}

function Architecture() {
  const steps = [
    { t: "Capteurs", d: "HX711, BME680, MQ-135, DS18B20, reed" },
    { t: "ESP32", d: "Cycle purge / accumulation, agrégation" },
    { t: "MQTT", d: "Télémétrie toutes les 2 s" },
    { t: "API", d: "FastAPI : score, prix, réservations" },
    { t: "Application", d: "Étudiants et commerçants" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <SectionHead k="04 — Architecture" title="Du gramme au panier réservé." />
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        {steps.map((s, i) => (
          <motion.div key={s.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="flex flex-1 items-center gap-3 md:flex-col md:items-stretch">
            <div className="panel flex-1 p-4">
              <p className="font-mono text-xs text-radar">0{i + 1}</p>
              <p className="font-display text-xl">{s.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
            {i < steps.length - 1 && <span className="text-center font-mono text-radar md:hidden">↓</span>}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
