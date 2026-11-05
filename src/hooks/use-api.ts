import { useEffect, useState } from "react";
import { subscribe, ensureStarted } from "@/services/api";

/** Re-reads `get` whenever the data layer emits, plus every second for countdowns. */
export function useLive<T>(get: () => T): T {
  const [v, setV] = useState<T>(get);
  useEffect(() => {
    ensureStarted();
    const u = subscribe(() => setV(get()));
    const i = setInterval(() => setV(get()), 1000);
    setV(get());
    return () => { u(); clearInterval(i); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
