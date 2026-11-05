// Pure pricing & freshness logic — shared by UI and (later) backend.

/** Hybrid freshness score 0–100: time-temperature (degree-hours above 4°C) + gas variation (%). */
export function freshnessScore(degreeHours: number, gasDropPct: number): number {
  const ttPenalty = Math.min(60, degreeHours * 1.5);
  const gasPenalty = Math.min(40, Math.max(0, gasDropPct) * 0.8);
  return Math.max(0, Math.round(100 - ttPenalty - gasPenalty));
}

export const DEGREE_HOURS_LIMIT = 30;
export const FLOOR_RATIO = 0.3;

export function freshnessFactor(score: number) {
  return 0.4 + 0.6 * (score / 100);
}

/** Time factor: full price until 3h before close, then linear down to 0.5 at closing. */
export function timeFactor(minutesToClose: number) {
  if (minutesToClose >= 180) return 1;
  return 0.5 + 0.5 * Math.max(0, minutesToClose) / 180;
}

export function roundHalf(v: number) {
  return Math.round(v * 2) / 2;
}

export function dynamicPrice(base: number, score: number, minutesToClose: number) {
  const ff = freshnessFactor(score);
  const tf = timeFactor(minutesToClose);
  const raw = base * ff * tf;
  const floor = base * FLOOR_RATIO;
  const price = roundHalf(Math.max(raw, floor));
  return { ff, tf, raw, floor, price, floored: raw < floor };
}

export function freshnessTone(score: number): "radar" | "amber" | "coral" {
  return score >= 70 ? "radar" : score >= 40 ? "amber" : "coral";
}

export const tnd = (v: number) => `${v.toFixed(v % 1 ? 1 : 0).replace(".", ",")} TND`;
