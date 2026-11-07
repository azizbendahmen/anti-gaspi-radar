import { motion, AnimatePresence } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import type { Workshop } from "@/hooks/use-box-workshop";
import { ItemShape } from "./shapes";

/** Front view of the connected box + plate. Door, LED and plate react to workshop state. */
export function BoxScene({ w }: { w: Workshop }) {
  const { state } = w;
  const composing = state === "IDLE" || state === "COMPOSING";
  const inside = !composing && state !== "PUBLISHED";
  const doorClosed = ["DOOR_CLOSING", "STABILIZING", "WEIGHING", "PURGING", "ACCUMULATING", "ANALYZING", "SENSOR_OFFLINE"].includes(state);
  const measuring = doorClosed && state !== "DOOR_CLOSING" && state !== "SENSOR_OFFLINE";
  const led = state === "DOOR_REOPENED" || state === "SENSOR_OFFLINE" ? "var(--coral)" : measuring || state === "DOOR_CLOSING" ? "var(--amber)" : "var(--radar)";

  return (
    <div className="relative mx-auto w-full max-w-[520px] select-none">
      <svg viewBox="0 0 400 300" className="w-full" aria-label="La box connectée">
        <defs>
          <radialGradient id="ws-light" cx="50%" cy="10%" r="80%">
            <stop offset="0%" stopColor="var(--radar)" stopOpacity={doorClosed ? 0.05 : 0.28} />
            <stop offset="100%" stopColor="var(--radar)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* body */}
        <rect x="70" y="20" width="260" height="210" rx="16" fill="var(--secondary)" stroke="var(--radar)" strokeOpacity=".35" />
        <rect x="90" y="40" width="220" height="170" rx="8" fill="var(--background)" />
        <rect x="90" y="40" width="220" height="170" rx="8" fill="url(#ws-light)" />
        <rect x="110" y="190" width="180" height="8" rx="3" fill="var(--muted)" />
        {/* fan */}
        <g transform="translate(290 58)">
          <motion.g animate={{ rotate: state === "PURGING" ? 360 : 0 }} transition={state === "PURGING" ? { repeat: Infinity, duration: 0.6, ease: "linear" } : { duration: 0.3 }}>
            {[0, 120, 240].map((a) => <ellipse key={a} cx="0" cy="-6" rx="3" ry="6" fill="var(--muted-foreground)" transform={`rotate(${a})`} />)}
          </motion.g>
        </g>
        {/* gas molecules */}
        <AnimatePresence>
          {state === "ACCUMULATING" && [0, 1, 2, 3, 4].map((i) => (
            <motion.circle key={i} r="4" fill="var(--amber)" fillOpacity=".5" cx={130 + i * 35}
              initial={{ cy: 180, opacity: 0 }} animate={{ cy: [180, 70], opacity: [0, 0.8, 0] }} exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.4 }} />
          ))}
        </AnimatePresence>
        {/* plate inside */}
        <AnimatePresence>
          {inside && (
            <motion.g initial={{ y: 90, scale: 1.4, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 90, damping: 16 }} style={{ originX: "200px", originY: "185px" }}>
              <ellipse cx="200" cy="185" rx="70" ry="10" fill="var(--foreground)" fillOpacity=".85" />
              {w.plate.slice(0, 8).map((p, i) => (
                <g key={p.uid} transform={`translate(${148 + (i % 4) * 26} ${150 - Math.floor(i / 4) * 16})`}><ItemShape kind={p.def.kind} size={30} /></g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>
        {/* door: hinges on the left, scales on X */}
        <g style={{ transformBox: "view-box", transformOrigin: "90px 125px", transform: `scaleX(${doorClosed ? 1 : 0.06})`, transition: doorClosed ? "transform .7s cubic-bezier(.34,1.56,.64,1)" : "transform .6s ease-out" }}>
          <rect x="90" y="40" width="220" height="170" rx="8" fill="var(--surface)" stroke="var(--radar)" strokeOpacity=".5" />
          <rect x="285" y="110" width="6" height="30" rx="3" fill="var(--muted-foreground)" />
          <text x="200" y="130" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">FWR-01</text>
        </g>
        {/* LED */}
        <motion.circle cx="200" cy="30" r="5" fill={led} animate={measuring || state === "DOOR_CLOSING" ? { opacity: [1, 0.25, 1] } : { opacity: 1 }} transition={{ repeat: measuring ? Infinity : 0, duration: 0.9 }} />
        <circle cx="200" cy="30" r="10" fill={led} fillOpacity=".2" />
        {/* legs / scale base */}
        <rect x="90" y="230" width="220" height="10" rx="4" fill="var(--muted)" />
      </svg>
      {composing && <Plate w={w} />}
      <AnimatePresence>
        {state === "DOOR_CLOSING" && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 top-2 text-center font-mono text-xs text-amber">clic — porte verrouillée</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Plate({ w }: { w: Workshop }) {
  const { setNodeRef, isOver } = useDroppable({ id: "plate" });
  return (
    <div ref={setNodeRef} aria-label="Assiette : déposez les produits ici"
      className={`relative -mt-6 mx-auto flex min-h-32 w-[90%] flex-wrap content-center items-center justify-center gap-1 rounded-[50%] border-2 border-dashed px-6 py-5 transition-colors ${isOver ? "border-radar bg-radar/10" : "border-foreground/25 bg-foreground/5"}`}>
      {w.plate.length === 0 && <p className="text-center text-sm text-muted-foreground">Glissez ou touchez des produits pour remplir l'assiette</p>}
      <AnimatePresence>
        {w.plate.map((p) => (
          <motion.button key={p.uid} layout initial={{ scale: 0, y: -30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 14 }} onClick={() => w.removeItem(p.uid)}
            className="rounded-lg p-0.5 hover:bg-coral/15" aria-label={`Retirer ${p.def.name}`}>
            <ItemShape kind={p.def.kind} size={38} />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
