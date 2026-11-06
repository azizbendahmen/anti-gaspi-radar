import { useCallback, useEffect, useRef, useState } from "react";
import {
  startMeasurementCycle, createLot, DEMO_DURATIONS, REAL_DURATIONS,
  type Category, type CyclePhase, type CycleResult,
} from "@/services/api";
import { dynamicPrice, freshnessScore, DEGREE_HOURS_LIMIT } from "@/lib/pricing";

export type WorkshopState =
  | "IDLE" | "COMPOSING" | "DOOR_CLOSING" | "STABILIZING" | "WEIGHING" | "PURGING" | "ACCUMULATING" | "ANALYZING"
  | "RESULTS" | "PUBLISHED" | "DOOR_REOPENED" | "SENSOR_OFFLINE";

export type ItemKind = "baguette" | "round" | "croissant" | "sandwich" | "dish" | "fruit" | "cake";
export interface ItemDef { id: string; name: string; grams: number; kind: ItemKind; price: number }
export interface Family { key: string; label: string; category: Category; items: ItemDef[] }

export const FAMILIES: Family[] = [
  { key: "pain", label: "Pain", category: "Boulangerie", items: [
    { id: "baguette", name: "Baguette", grams: 250, kind: "baguette", price: 0.5 },
    { id: "tabouna", name: "Tabouna", grams: 300, kind: "round", price: 1 },
    { id: "complet", name: "Pain complet", grams: 400, kind: "round", price: 2 } ] },
  { key: "vienno", label: "Viennoiseries", category: "Boulangerie", items: [
    { id: "croissant", name: "Croissant", grams: 60, kind: "croissant", price: 1.2 },
    { id: "choco", name: "Pain au chocolat", grams: 70, kind: "croissant", price: 1.5 } ] },
  { key: "sandwich", label: "Sandwichs", category: "Plats cuisinés", items: [
    { id: "chapati", name: "Chapati", grams: 220, kind: "sandwich", price: 4 },
    { id: "baguette-thon", name: "Baguette thon", grams: 280, kind: "sandwich", price: 4.5 } ] },
  { key: "plats", label: "Plats cuisinés", category: "Plats cuisinés", items: [
    { id: "couscous", name: "Couscous", grams: 450, kind: "dish", price: 9 },
    { id: "lablabi", name: "Lablabi", grams: 400, kind: "dish", price: 5 } ] },
  { key: "fruits", label: "Fruits", category: "Fruits & légumes", items: [
    { id: "orange", name: "Orange", grams: 180, kind: "fruit", price: 0.6 },
    { id: "pomme", name: "Pomme", grams: 150, kind: "fruit", price: 0.8 } ] },
  { key: "patis", label: "Pâtisseries", category: "Pâtisserie", items: [
    { id: "millefeuille", name: "Mille-feuille", grams: 120, kind: "cake", price: 3 },
    { id: "makroud", name: "Makroud", grams: 50, kind: "cake", price: 1 } ] },
];

export interface PlateItem { uid: string; def: ItemDef }
export const PHASE_STATES: CyclePhase[] = ["STABILIZING", "WEIGHING", "PURGING", "ACCUMULATING", "ANALYZING"];

export function verdict(score: number, blocked: boolean) {
  if (blocked) return { label: "Bloqué", stamp: "BLOQUÉ", tone: "coral" as const };
  if (score >= 80) return { label: "Excellent", stamp: "APTE À LA VENTE", tone: "radar" as const };
  if (score >= 60) return { label: "Bon", stamp: "APTE À LA VENTE", tone: "radar" as const };
  return { label: "À vendre vite", stamp: "À SURVEILLER", tone: "amber" as const };
}

export function useBoxWorkshop() {
  const [state, setState] = useState<WorkshopState>("IDLE");
  const [family, setFamily] = useState<Family>(FAMILIES[0]);
  const [plate, setPlate] = useState<PlateItem[]>([]);
  const [demo, setDemo] = useState(true);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [progress, setProgress] = useState({ remaining: 0, total: 1, totalRemaining: 0 });
  const [result, setResult] = useState<CycleResult>();
  const [priceOverride, setPriceOverride] = useState<number>();
  const [publishedId, setPublishedId] = useState<string>();
  const [producedAt] = useState(() => new Date(Date.now() - 3 * 3600_000));
  const [closesAt] = useState(() => { const d = new Date(); d.setHours(20, 0, 0, 0); if (d.getTime() < Date.now()) d.setTime(Date.now() + 3 * 3600_000); return d; });
  const cycle = useRef<ReturnType<typeof startMeasurementCycle>>();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { cycle.current?.cancel(); clearTimeout(timer.current); }, []);

  const estimatedWeight = plate.reduce((s, p) => s + p.def.grams, 0);
  const basePrice = Math.max(1, Math.round(plate.reduce((s, p) => s + p.def.price, 0) * 2) / 2);
  const counts = plate.reduce<Record<string, { def: ItemDef; n: number }>>((m, p) => { (m[p.def.id] ??= { def: p.def, n: 0 }).n++; return m; }, {});
  const lotName = plate.length ? `Panier ${family.label.toLowerCase()} · ${plate.length} pièce${plate.length > 1 ? "s" : ""}` : "Nouveau panier";

  const addItem = useCallback((def: ItemDef) => {
    setState((s) => (s === "IDLE" ? "COMPOSING" : s));
    setPlate((p) => (p.length >= 12 ? p : [...p, { uid: Math.random().toString(36).slice(2), def }]));
  }, []);
  const removeItem = (uid: string) => setPlate((p) => p.filter((x) => x.uid !== uid));
  const chooseFamily = (f: Family) => { setFamily(f); setState((s) => (s === "IDLE" ? "COMPOSING" : s)); };

  const run = useCallback(() => {
    cycle.current?.cancel();
    setResult(undefined); setPriceOverride(undefined);
    setState("DOOR_CLOSING");
    timer.current = setTimeout(() => {
      cycle.current = startMeasurementCycle(
        { durations: demo ? DEMO_DURATIONS : REAL_DURATIONS, estimatedWeight, category: family.category, producedHoursAgo: (Date.now() - producedAt.getTime()) / 3600_000, simulateOffline },
        (e) => {
          if (e.type === "phase") setState(e.phase);
          else if (e.type === "tick") setProgress({ remaining: e.remaining, total: e.total, totalRemaining: e.totalRemaining });
          else if (e.type === "door_open") setState("DOOR_REOPENED");
          else if (e.type === "offline") setState("SENSOR_OFFLINE");
          else if (e.type === "done") { setResult(e.result); setState("RESULTS"); }
        },
      );
    }, 1600);
  }, [demo, estimatedWeight, family.category, producedAt, simulateOffline]);

  const minutesToClose = (closesAt.getTime() - Date.now()) / 60000;
  const score = result ? freshnessScore(result.degreeHours, result.gasDropPct) : 0;
  const blocked = !!result && result.degreeHours > DEGREE_HOURS_LIMIT;
  const calc = dynamicPrice(basePrice, score, minutesToClose);
  const finalPrice = priceOverride ?? calc.price;

  const publish = () => {
    if (!result || blocked) return;
    const id = createLot({
      category: family.category, weight_g: result.weight_g, basePrice, closesAt: closesAt.getTime(),
      contents: Object.values(counts).map((c) => `${c.n} ${c.def.name.toLowerCase()}`).join(", "),
      degreeHours: result.degreeHours, gasDropPct: result.gasDropPct, priceOverride,
    });
    setPublishedId(id); setState("PUBLISHED");
  };
  const reset = () => { cycle.current?.cancel(); setPlate([]); setResult(undefined); setPublishedId(undefined); setState("IDLE"); };

  return {
    state, family, chooseFamily, plate, addItem, removeItem, counts, estimatedWeight, basePrice, lotName,
    producedAt, closesAt, demo, setDemo, simulateOffline, setSimulateOffline, progress,
    run, openDoor: () => cycle.current?.openDoor(), result, score, blocked, calc, finalPrice, priceOverride, setPriceOverride,
    publish, publishedId, reset, useSimulation: () => { setSimulateOffline(false); },
  };
}
export type Workshop = ReturnType<typeof useBoxWorkshop>;
