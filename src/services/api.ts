/**
 * Single data-access layer. Currently backed by an in-browser simulator.
 * Replace the bodies with FastAPI/MQTT calls later without touching the UI.
 */
import { dynamicPrice, freshnessScore, DEGREE_HOURS_LIMIT } from "@/lib/pricing";

export const SIMULATED = true;
export const LOCK_MINUTES = 10;

export type Phase = "idle" | "purge" | "accumulation";
export interface Telemetry {
  ts: number; gas_bme: number; gas_mq: number; temp: number; hum: number;
  weight_g: number; door: boolean; fan: boolean; phase: Phase;
}
export type Category = "Boulangerie" | "Pâtisserie" | "Plats cuisinés" | "Fruits & légumes";
export const CATEGORIES: Category[] = ["Boulangerie", "Pâtisserie", "Plats cuisinés", "Fruits & légumes"];

export interface Lot {
  id: string; merchant: string; address: string; category: Category; contents: string;
  weight_g: number; basePrice: number; closesAt: number;
  degreeHours: number; gasDropPct: number;
  reservedUntil?: number | undefined; reservedBy?: string | undefined; pickedUp?: boolean;
  angle: number;
  priceOverride?: number;
}
export interface PricedLot extends Lot {
  score: number; minutesToClose: number; price: number; blocked: boolean;
  calc: ReturnType<typeof dynamicPrice>;
}

const min = 60_000;
const now0 = Date.now();
let lots: Lot[] = [
  { id: "L-101", merchant: "Boulangerie El Medina", address: "Rue de Marseille, Tunis", category: "Boulangerie", contents: "4 baguettes, 2 pains complets, 3 croissants", weight_g: 1450, basePrice: 9, closesAt: now0 + 95 * min, degreeHours: 4, gasDropPct: 6, angle: 30 },
  { id: "L-102", merchant: "Pâtisserie Ennasr", address: "Av. Hédi Nouira, Ennasr", category: "Pâtisserie", contents: "6 mille-feuilles, 4 makrouds", weight_g: 820, basePrice: 18, closesAt: now0 + 160 * min, degreeHours: 9, gasDropPct: 14, angle: 110 },
  { id: "L-103", merchant: "Cantine Lafayette", address: "Rue Pierre de Coubertin", category: "Plats cuisinés", contents: "3 couscous au poulet, 2 salades méchouia", weight_g: 2100, basePrice: 24, closesAt: now0 + 40 * min, degreeHours: 18, gasDropPct: 22, angle: 200 },
  { id: "L-104", merchant: "Marché Central — Stand 12", address: "Rue Charles de Gaulle", category: "Fruits & légumes", contents: "Panier mixte : tomates, poivrons, oranges", weight_g: 3200, basePrice: 10, closesAt: now0 + 230 * min, degreeHours: 6, gasDropPct: 4, angle: 290 },
  { id: "L-105", merchant: "Boulangerie Bab Saadoun", address: "Place Bab Saadoun", category: "Boulangerie", contents: "Tabouna x5, 2 pains au sésame", weight_g: 1100, basePrice: 7, closesAt: now0 + 70 * min, degreeHours: 12, gasDropPct: 10, angle: 160 },
  { id: "L-106", merchant: "Traiteur Les Berges", address: "Les Berges du Lac", category: "Plats cuisinés", contents: "4 lasagnes, 2 tajines malsouka", weight_g: 1900, basePrice: 28, closesAt: now0 + 120 * min, degreeHours: 33, gasDropPct: 30, angle: 250 },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

function price(l: Lot): PricedLot {
  const score = freshnessScore(l.degreeHours, l.gasDropPct);
  const minutesToClose = Math.max(0, (l.closesAt - Date.now()) / min);
  const calc = dynamicPrice(l.basePrice, score, minutesToClose);
  return { ...l, score, minutesToClose, price: l.priceOverride ?? calc.price, calc, blocked: l.degreeHours > DEGREE_HOURS_LIMIT };
}

function releaseExpired() {
  const t = Date.now();
  lots = lots.map((l) => (l.reservedUntil && l.reservedUntil < t && !l.pickedUp ? { ...l, reservedUntil: undefined, reservedBy: undefined } : l));
}

export function getLots(): PricedLot[] { releaseExpired(); return lots.filter((l) => !l.pickedUp).map(price); }
export function getLot(id: string) { releaseExpired(); const l = lots.find((x) => x.id === id); return l ? price(l) : undefined; }

export function isAvailable(l: PricedLot, me?: string) {
  return !l.blocked && !l.pickedUp && (!l.reservedUntil || l.reservedBy === me);
}

const ME_KEY = "fwr-client";
export function clientId() {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(ME_KEY);
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem(ME_KEY, id); }
  return id;
}

export async function reserveLot(id: string, who = clientId()): Promise<{ ok: true; lot: PricedLot } | { ok: false; reason: string }> {
  releaseExpired();
  const l = lots.find((x) => x.id === id);
  if (!l) return { ok: false, reason: "Panier introuvable." };
  if (l.degreeHours > DEGREE_HOURS_LIMIT) return { ok: false, reason: "Lot bloqué pour raison de sécurité." };
  if (l.reservedUntil && l.reservedBy !== who) return { ok: false, reason: "Déjà réservé par quelqu'un d'autre." };
  l.reservedUntil = Date.now() + LOCK_MINUTES * min; l.reservedBy = who;
  emit();
  return { ok: true, lot: price(l) };
}

export function cancelReservation(id: string) {
  const l = lots.find((x) => x.id === id);
  if (l) { l.reservedUntil = undefined; l.reservedBy = undefined; emit(); }
}

export function validatePickup(code: string): { ok: boolean; message: string } {
  const id = code.replace(/^FWR:/, "").split(":")[0];
  const l = lots.find((x) => x.id === id);
  if (!l) return { ok: false, message: "Code inconnu." };
  if (!l.reservedUntil) return { ok: false, message: "Aucune réservation active pour ce lot." };
  l.pickedUp = true; emit();
  return { ok: true, message: `Retrait validé : ${l.merchant} (${l.id})` };
}

export function createLot(input: { category: Category; weight_g: number; basePrice: number; contents: string; degreeHours?: number; gasDropPct?: number; priceOverride?: number; closesAt?: number }) {
  const id = `L-${100 + lots.length + 1}`;
  lots = [...lots, { id, merchant: "Votre commerce", address: "Boîte FWR-01", closesAt: Date.now() + 150 * min, degreeHours: 0, gasDropPct: 0, angle: Math.random() * 360, ...input }];
  emit();
  return id;
}

/* ---------------- Measurement cycle (replaceable by real ESP32 events) ---------------- */
export type CyclePhase = "STABILIZING" | "WEIGHING" | "PURGING" | "ACCUMULATING" | "ANALYZING";
export const CYCLE_PHASES: CyclePhase[] = ["STABILIZING", "WEIGHING", "PURGING", "ACCUMULATING", "ANALYZING"];
export type CycleDurations = Record<CyclePhase, number>; // seconds
export const DEMO_DURATIONS: CycleDurations = { STABILIZING: 3, WEIGHING: 3, PURGING: 5, ACCUMULATING: 6, ANALYZING: 3 };
export const REAL_DURATIONS: CycleDurations = { STABILIZING: 15, WEIGHING: 10, PURGING: 45, ACCUMULATING: 240, ANALYZING: 5 };

export interface CycleResult { weight_g: number; temp: number; hum: number; maxTemp: number; degreeHours: number; gasDropPct: number; }
export type CycleEvent =
  | { type: "phase"; phase: CyclePhase; duration: number }
  | { type: "tick"; phase: CyclePhase; remaining: number; total: number; totalRemaining: number }
  | { type: "door_open" }
  | { type: "offline" }
  | { type: "done"; result: CycleResult };

export function startMeasurementCycle(
  opts: { durations: CycleDurations; estimatedWeight: number; category: Category; producedHoursAgo: number; simulateOffline?: boolean },
  onEvent: (e: CycleEvent) => void,
) {
  let stopped = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const total = CYCLE_PHASES.reduce((s, p) => s + opts.durations[p], 0);
  if (opts.simulateOffline) { timers.push(setTimeout(() => !stopped && onEvent({ type: "offline" }), 1200)); return { cancel: () => { stopped = true; timers.forEach(clearTimeout); }, openDoor: () => {} }; }

  let idx = 0, remaining = opts.durations[CYCLE_PHASES[0]!], elapsed = 0;
  onEvent({ type: "phase", phase: CYCLE_PHASES[0]!, duration: remaining });
  const iv = setInterval(() => {
    if (stopped) return;
    remaining -= 0.25; elapsed += 0.25;
    if (remaining <= 0) {
      idx++;
      if (idx >= CYCLE_PHASES.length) {
        clearInterval(iv); stopped = true;
        const perish = opts.category === "Plats cuisinés" ? 2.2 : opts.category === "Pâtisserie" ? 1.6 : 1;
        const maxTemp = +(4 + Math.random() * 4).toFixed(1);
        onEvent({ type: "done", result: {
          weight_g: Math.round(opts.estimatedWeight * (0.88 + Math.random() * 0.26)),
          temp: +(cur.temp).toFixed(1), hum: Math.round(cur.hum), maxTemp,
          degreeHours: +(opts.producedHoursAgo * Math.max(0.5, maxTemp - 4) * perish).toFixed(1),
          gasDropPct: +(Math.random() * 18 * perish).toFixed(1),
        } });
        return;
      }
      remaining = opts.durations[CYCLE_PHASES[idx]!];
      onEvent({ type: "phase", phase: CYCLE_PHASES[idx]!, duration: remaining });
    }
    onEvent({ type: "tick", phase: CYCLE_PHASES[idx]!, remaining, total: opts.durations[CYCLE_PHASES[idx]!], totalRemaining: total - elapsed });
  }, 250);
  return {
    cancel: () => { stopped = true; clearInterval(iv); timers.forEach(clearTimeout); },
    openDoor: () => { if (stopped) return; stopped = true; clearInterval(iv); onEvent({ type: "door_open" }); },
  };
}

/* ---------------- Telemetry simulator ---------------- */
const HISTORY = 24 * 30; // 24h at 2-min resolution (seed), then live 2s ticks appended
let history: Telemetry[] = [];
let cur: Telemetry = { ts: Date.now(), gas_bme: 142, gas_mq: 310, temp: 4.2, hum: 62, weight_g: 1450, door: false, fan: false, phase: "idle" };
let cycle = 0;
let doorOpenSince: number | null = null;

function step(prev: Telemetry, ts: number, doorChance = 0.04): Telemetry {
  cycle = (cycle + 1) % 60;
  const phase: Phase = cycle < 8 ? "purge" : cycle < 40 ? "accumulation" : "idle";
  const door = prev.door ? Math.random() > 0.35 : Math.random() < doorChance;
  const fan = phase === "purge";
  const target = door ? 9 : 4;
  const temp = +(prev.temp + (target - prev.temp) * 0.15 + (Math.random() - 0.5) * 0.15).toFixed(2);
  const hum = +(prev.hum + (door ? 1.2 : -0.3) + (Math.random() - 0.5)).toFixed(1);
  const gasBme = phase === "purge" ? prev.gas_bme + (150 - prev.gas_bme) * 0.3 : phase === "accumulation" ? prev.gas_bme - 0.6 - Math.random() * 0.6 : prev.gas_bme + (Math.random() - 0.5);
  const gasMq = phase === "purge" ? prev.gas_mq + (300 - prev.gas_mq) * 0.3 : phase === "accumulation" ? prev.gas_mq + 1 + Math.random() * 1.5 : prev.gas_mq + (Math.random() - 0.5) * 2;
  const weight = door && Math.random() < 0.3 ? Math.max(0, prev.weight_g - Math.round(Math.random() * 180)) : prev.weight_g + Math.round((Math.random() - 0.5) * 3);
  return { ts, gas_bme: +gasBme.toFixed(1), gas_mq: +gasMq.toFixed(1), temp, hum: Math.min(90, Math.max(40, hum)), weight_g: weight, door, fan, phase };
}

(function seed() {
  let t = Date.now() - HISTORY * 2 * min;
  let p = { ...cur, weight_g: 4200 };
  for (let i = 0; i < HISTORY; i++) { t += 2 * min; p = step(p, t, 0.03); if (p.weight_g < 600) p.weight_g = 4200; history.push(p); }
  cur = { ...p, ts: Date.now() };
})();

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  setInterval(() => {
    cur = step(cur, Date.now());
    if (cur.door) doorOpenSince ??= Date.now(); else doorOpenSince = null;
    history = [...history.slice(-HISTORY), cur];
    // telemetry feeds the lot currently in the box (L-101)
    const boxLot = lots.find((l) => l.id === "L-101");
    if (boxLot) { boxLot.degreeHours = +(boxLot.degreeHours + Math.max(0, cur.temp - 4) * (2 / 3600)).toFixed(3); }
    emit();
  }, 2000);
}

export function getTelemetry() { start(); return { current: cur, history, doorOpenSeconds: doorOpenSince ? (Date.now() - doorOpenSince) / 1000 : 0 }; }
export function ensureStarted() { start(); }
