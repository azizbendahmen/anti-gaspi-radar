import type { ItemKind } from "@/hooks/use-box-workshop";

/** Flat SVG ingredient shapes, drawn in a 40×40 box. */
export function ItemShape({ kind, size = 40 }: { kind: ItemKind; size?: number }) {
  const s = { width: size, height: size };
  switch (kind) {
    case "baguette": return <svg viewBox="0 0 40 40" {...s}><rect x="3" y="15" width="34" height="10" rx="5" fill="var(--amber)" transform="rotate(-20 20 20)" /><path d="M12 17l3 4M18 15l3 4M24 13l3 4" stroke="var(--background)" strokeOpacity=".4" strokeWidth="1.5" transform="rotate(-20 20 20) translate(0 2)" /></svg>;
    case "round": return <svg viewBox="0 0 40 40" {...s}><ellipse cx="20" cy="22" rx="15" ry="11" fill="var(--amber)" /><path d="M12 20q8-6 16 0" stroke="var(--background)" strokeOpacity=".35" strokeWidth="1.5" fill="none" /></svg>;
    case "croissant": return <svg viewBox="0 0 40 40" {...s}><path d="M5 26 Q20 4 35 26 Q28 20 20 21 Q12 20 5 26Z" fill="var(--amber)" /><path d="M14 18v5M20 15v6M26 18v5" stroke="var(--background)" strokeOpacity=".35" strokeWidth="1.5" /></svg>;
    case "sandwich": return <svg viewBox="0 0 40 40" {...s}><rect x="5" y="13" width="30" height="7" rx="3.5" fill="var(--amber)" /><rect x="6" y="19" width="28" height="4" fill="var(--radar)" /><rect x="5" y="22" width="30" height="7" rx="3.5" fill="var(--amber)" /></svg>;
    case "dish": return <svg viewBox="0 0 40 40" {...s}><ellipse cx="20" cy="26" rx="16" ry="7" fill="var(--muted-foreground)" /><ellipse cx="20" cy="22" rx="11" ry="7" fill="var(--amber)" /><circle cx="16" cy="20" r="2" fill="var(--coral)" /><circle cx="23" cy="21" r="2" fill="var(--radar)" /></svg>;
    case "fruit": return <svg viewBox="0 0 40 40" {...s}><circle cx="20" cy="23" r="12" fill="var(--coral)" /><path d="M20 11q4-5 8-3-2 5-8 3" fill="var(--radar)" /></svg>;
    case "cake": return <svg viewBox="0 0 40 40" {...s}><rect x="7" y="16" width="26" height="14" rx="2" fill="var(--amber)" /><rect x="7" y="21" width="26" height="3" fill="var(--foreground)" fillOpacity=".8" /><rect x="7" y="14" width="26" height="4" rx="2" fill="var(--foreground)" /></svg>;
  }
}
