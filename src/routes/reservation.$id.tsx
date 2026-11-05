import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { getLot, cancelReservation, clientId } from "@/services/api";
import { useLive, useHydrated } from "@/hooks/use-api";
import { RadarLoader } from "@/components/Radar";
import { tnd } from "@/lib/pricing";

export const Route = createFileRoute("/reservation/$id")({
  head: () => ({
    meta: [
      { title: "Votre réservation — Food Waste Radar" },
      { name: "description", content: "QR code de retrait de votre panier réservé." },
      { property: "og:title", content: "Réservation — Food Waste Radar" },
      { property: "og:description", content: "Présentez ce QR code au commerçant." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reservation,
});

function Reservation() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const lot = useLive(() => getLot(id));
  if (!hydrated) return <RadarLoader />;
  const active = lot && lot.reservedUntil && lot.reservedBy === clientId();
  const left = active ? Math.max(0, (lot.reservedUntil! - Date.now()) / 1000) : 0;

  if (!lot || !active) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-4xl font-light">{lot?.pickedUp ? "Retrait validé" : "Réservation expirée"}</h1>
        <p className="mt-3 text-muted-foreground">{lot?.pickedUp ? "Bon appétit, et merci d'avoir sauvé ce panier." : "Le verrou de 10 minutes est terminé ; le panier est de nouveau visible pour tous."}</p>
        <Link to="/etudiant" className="btn-radar mt-8">Retour au radar</Link>
      </main>
    );
  }
  const mm = Math.floor(left / 60), ss = Math.floor(left % 60);
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="panel flex flex-col items-center gap-5 p-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-radar">Panier verrouillé</p>
        <p className="font-mono text-5xl tabular-nums" aria-live="polite">{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</p>
        <div className="rounded-xl bg-foreground p-4">
          <QRCodeSVG value={`FWR:${lot.id}:${lot.reservedBy}`} size={200} bgColor="transparent" fgColor="var(--background)" />
        </div>
        <div>
          <h1 className="text-2xl">{lot.merchant}</h1>
          <p className="text-sm text-muted-foreground">{lot.address}</p>
          <p className="mt-2 text-sm">{lot.contents}</p>
          <p className="mt-2 font-display text-3xl text-radar">{tnd(lot.price)}</p>
          <p className="font-mono text-xs text-muted-foreground">code : {lot.id}</p>
        </div>
        <button className="btn-ghost" onClick={() => cancelReservation(lot.id)}>Annuler la réservation</button>
      </motion.div>
    </main>
  );
}
