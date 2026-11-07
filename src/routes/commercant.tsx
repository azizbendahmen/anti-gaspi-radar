import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getTelemetry, getLots, createLot, validatePickup, CATEGORIES, type Category, type Phase } from "@/services/api";
import { useLive, useHydrated } from "@/hooks/use-api";
import { RadarLoader } from "@/components/Radar";
import { BoxWorkshop } from "@/components/workshop/BoxWorkshop";
import { DEGREE_HOURS_LIMIT, tnd } from "@/lib/pricing";

export const Route = createFileRoute("/commercant")({
  head: () => ({
    meta: [
      { title: "Tableau de bord commerçant — Food Waste Radar" },
      { name: "description", content: "Télémétrie en temps réel de la boîte connectée, moteur de prix et validation des retraits." },
      { property: "og:title", content: "Tableau de bord commerçant — Food Waste Radar" },
      { property: "og:description", content: "Poids, température, gaz et prix dynamique en direct." },
    ],
  }),
  component: Merchant,
});

const DOOR_ALERT_S = 30;

function Merchant() {
  const hydrated = useHydrated();
  const tel = useLive(getTelemetry);
  const lots = useLive(getLots);
  if (!hydrated) return <RadarLoader label="Connexion à la boîte FWR-01…" />;
  const c = tel.current;
  const blocked = lots.filter((l) => l.blocked);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-radar">Boîte FWR-01 · en direct</p>
        <h1 className="text-4xl font-light md:text-5xl">Tableau de bord</h1>
      </div>

      {blocked.map((l) => (
        <div key={l.id} role="alert" className="rounded-xl border border-coral/50 bg-coral/10 p-4 text-sm">
          <strong className="text-coral">Lot bloqué — {l.id}</strong> · {l.merchant} : {l.degreeHours.toFixed(1)} °C·h dépasse le seuil de {DEGREE_HOURS_LIMIT} °C·h. Retiré de la vente.
        </div>
      ))}
      {tel.doorOpenSeconds > DOOR_ALERT_S && (
        <div role="alert" className="rounded-xl border border-amber/50 bg-amber/10 p-4 text-sm text-amber">
          Porte ouverte depuis {Math.round(tel.doorOpenSeconds)} s — refermez la boîte pour préserver la chaîne du froid.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Stat label="Poids" value={`${c.weight_g} g`} />
        <Stat label="Température" value={`${c.temp.toFixed(1)} °C`} tone={c.temp > 6 ? "text-amber" : undefined} />
        <Stat label="Humidité" value={`${c.hum.toFixed(0)} %`} />
        <Stat label="Porte" value={c.door ? "ouverte" : "fermée"} tone={c.door ? "text-amber" : "text-radar"} />
        <Stat label="Ventilateur" value={c.fan ? "actif" : "arrêt"} tone={c.fan ? "text-radar" : undefined} />
        <Stat label="Gaz BME680" value={`${c.gas_bme.toFixed(0)} kΩ`} />
      </div>

      <BoxWorkshop />

      <PhaseTimeline phase={c.phase} />

      <div className="grid gap-4 md:grid-cols-3">
        <Chart title="Température (°C)" data={tel.history} lines={[{ k: "temp", c: "var(--amber)" }]} />
        <Chart title="Gaz : BME680 (kΩ) / MQ-135 (ppm brut)" data={tel.history} lines={[{ k: "gas_bme", c: "var(--radar)" }, { k: "gas_mq", c: "var(--coral)" }]} />
        <Chart title="Poids (g)" data={tel.history} lines={[{ k: "weight_g", c: "var(--foreground)" }]} />
      </div>

      <section className="panel p-6">
        <h2 className="text-2xl">Moteur de prix</h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">prix = base × facteur fraîcheur × facteur temps · plancher 30 % · arrondi 0,5 TND</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left font-mono text-xs text-muted-foreground">
              <tr><th className="py-2">Lot</th><th>Score</th><th>Base</th><th>× fraîch.</th><th>× temps</th><th>= brut</th><th>Prix</th><th>État</th></tr>
            </thead>
            <tbody className="font-mono">
              {lots.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-2 font-sans">{l.id} <span className="text-muted-foreground">{l.merchant}</span></td>
                  <td>{l.score}</td><td>{tnd(l.basePrice)}</td><td>{l.calc.ff.toFixed(2)}</td><td>{l.calc.tf.toFixed(2)}</td>
                  <td>{l.calc.raw.toFixed(2)}{l.calc.floored && <span className="text-amber"> → plancher</span>}</td>
                  <td className="text-radar">{tnd(l.price)}</td>
                  <td>{l.blocked ? <span className="text-coral">bloqué</span> : l.reservedUntil ? <span className="text-amber">réservé</span> : "en vente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4">
        <Scanner />
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string | undefined }) {
  return (
    <div className="panel p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <motion.p key={value} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className={`font-mono text-xl ${tone ?? ""}`}>{value}</motion.p>
    </div>
  );
}

function PhaseTimeline({ phase }: { phase: Phase }) {
  const phases: { k: Phase; l: string; d: string }[] = [
    { k: "purge", l: "Purge", d: "ventilateur, air renouvelé" },
    { k: "accumulation", l: "Accumulation", d: "boîte close, gaz mesuré" },
    { k: "idle", l: "Repos", d: "veille basse consommation" },
  ];
  return (
    <div className="panel grid grid-cols-3 gap-2 p-3">
      {phases.map((p) => (
        <div key={p.k} className={`rounded-lg p-3 transition-colors ${phase === p.k ? "bg-radar/15" : ""}`}>
          <p className={`font-mono text-xs uppercase tracking-wider ${phase === p.k ? "text-radar" : "text-muted-foreground"}`}>{phase === p.k ? "● " : ""}{p.l}</p>
          <p className="hidden text-xs text-muted-foreground sm:block">{p.d}</p>
        </div>
      ))}
    </div>
  );
}

function Chart({ title, data, lines }: { title: string; data: object[]; lines: { k: string; c: string }[] }) {
  const pts = data.filter((_, i) => i % 6 === 0 || i > data.length - 30);
  return (
    <div className="panel p-4">
      <p className="mb-2 text-sm text-muted-foreground">{title} · 24 h</p>
      <div className="h-44">
        <ResponsiveContainer>
          <LineChart data={pts}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="ts" tickFormatter={(t) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} minTickGap={40} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={36} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }} labelFormatter={(t) => new Date(t as number).toLocaleTimeString("fr-FR")} />
            {lines.map((l) => <Line key={l.k} dataKey={l.k} stroke={l.c} dot={false} strokeWidth={1.5} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function NewLot({ weight }: { weight: number }) {
  const [cat, setCat] = useState<Category>("Boulangerie");
  const [base, setBase] = useState(10);
  const [contents, setContents] = useState("");
  const [done, setDone] = useState<string>();
  return (
    <section className="panel space-y-4 p-6">
      <h2 className="text-2xl">Nouveau lot</h2>
      <p className="text-sm text-muted-foreground">Posez le panier sur la balance : le poids est prérempli.</p>
      <p className="font-mono text-3xl text-radar">{weight} g</p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1.5 text-sm ${cat === c ? "border-radar text-radar" : "border-border text-muted-foreground"}`}>{c}</button>
        ))}
      </div>
      <input value={contents} onChange={(e) => setContents(e.target.value)} placeholder="Contenu (ex. 5 baguettes, 2 brioches)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      <label className="flex items-center gap-3 text-sm">Prix de base
        <input type="number" min={1} step={0.5} value={base} onChange={(e) => setBase(+e.target.value)} className="w-24 rounded-lg border border-input bg-background px-3 py-2 font-mono" /> TND
      </label>
      <button className="btn-radar" onClick={() => { setDone(createLot({ category: cat, weight_g: weight, basePrice: base, contents: contents || `Panier ${cat.toLowerCase()}` })); setContents(""); }}>Publier sur le radar</button>
      {done && <p className="text-sm text-radar">Lot {done} publié.</p>}
    </section>
  );
}

function Scanner() {
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string }>();

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | undefined, raf = 0, stopped = false;
    const BD = (window as unknown as { BarcodeDetector?: new (o: object) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream; await video.current.play();
        if (!BD) { setMsg({ ok: false, message: "Lecture automatique non prise en charge par ce navigateur : saisissez le code." }); return; }
        const det = new BD({ formats: ["qr_code"] });
        const loop = async () => {
          if (stopped || !video.current) return;
          const r = await det.detect(video.current).catch(() => []);
          if (r[0]) { setMsg(validatePickup(r[0].rawValue)); setOn(false); return; }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch { setMsg({ ok: false, message: "Caméra indisponible. Saisissez le code manuellement." }); setOn(false); }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [on]);

  return (
    <section className="panel space-y-4 p-6">
      <h2 className="text-2xl">Valider un retrait</h2>
      {on ? <video ref={video} className="aspect-square w-full rounded-lg bg-background object-cover" muted playsInline /> :
        <button className="btn-ghost" onClick={() => { setMsg(undefined); setOn(true); }}>Ouvrir la caméra</button>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setMsg(validatePickup(code.trim().toUpperCase())); setCode(""); }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ou code : L-101" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm" />
        <button className="btn-radar !py-2">Valider</button>
      </form>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-radar" : "text-coral"}`}>{msg.message}</p>}
    </section>
  );
}
