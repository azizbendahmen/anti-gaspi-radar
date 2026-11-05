import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos du projet — Food Waste Radar" },
      { name: "description", content: "Objectifs, limites assumées, plan d'évaluation et équipe du projet Food Waste Radar." },
      { property: "og:title", content: "À propos — Food Waste Radar" },
      { property: "og:description", content: "Un prototype IoT honnête sur ce qu'il mesure et ce qu'il ne mesure pas." },
    ],
  }),
  component: About,
});

const blocks = [
  { k: "Objectifs", items: ["Réduire les invendus jetés par les boulangeries, pâtisseries et cantines du quartier.", "Offrir aux étudiants des repas de qualité à prix réduit, en TND.", "Rendre le prix lisible : chaque baisse est justifiée par une mesure."] },
  { k: "Limites assumées", items: ["Le gaz seul ne prédit pas la fraîcheur du pain : le rassissement n'émet presque rien de mesurable.", "Les capteurs MOX dérivent ; nous n'exploitons que des variations relatives après purge.", "Le score est un indicateur d'aide, pas une garantie sanitaire : la règle des degrés-heures prime et bloque le lot."] },
  { k: "Plan d'évaluation", items: ["Étalonnage de la balance avec des masses connues (erreur cible < 5 g).", "Comparaison du score à un jury sensoriel sur 4 catégories d'aliments.", "Pilote de 8 semaines avec 3 commerçants : kg sauvés, taux de retrait, satisfaction."] },
];

function About() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-radar">Le projet</p>
      <h1 className="mt-2 text-5xl font-light">Mesurer honnêtement, <em className="text-radar">gaspiller moins.</em></h1>
      <div className="mt-12 space-y-10">
        {blocks.map((b) => (
          <section key={b.k} className="grid gap-4 md:grid-cols-[200px_1fr]">
            <h2 className="text-2xl">{b.k}</h2>
            <ul className="space-y-3">
              {b.items.map((i) => <li key={i} className="panel p-4 text-muted-foreground">{i}</li>)}
            </ul>
          </section>
        ))}
        <section className="grid gap-4 md:grid-cols-[200px_1fr]">
          <h2 className="text-2xl">Équipe</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Électronique", "capteurs & ESP32"], ["Backend", "FastAPI & MQTT"], ["Interface", "application web"]].map(([r, d]) => (
              <div key={r} className="panel p-4"><p className="font-display text-lg">{r}</p><p className="text-sm text-muted-foreground">{d}</p></div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
