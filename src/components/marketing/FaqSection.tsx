"use client";

import { motion } from "framer-motion";

const faqs = [
  {
    q: "Für wen ist TableHeroes gedacht?",
    a: "Für Spielleitungen, die ihre Kampagne strukturiert vorbereiten möchten, und für Gruppen, die Loot, Ziele und Downtime zentral verwalten wollen.",
  },
  {
    q: "Kann ich mehrere Kampagnen gleichzeitig verwalten?",
    a: "Ja. TableHeroes ist darauf ausgelegt, mehrere Kampagnen parallel zu organisieren – sauber getrennt, schnell auffindbar und ohne Chaos.",
  },
  {
    q: "Unterstützt ihr mein System?",
    a: "TableHeroes fokussiert sich auf Kampagnen-Organisation statt Regel-Engine. Deshalb funktioniert es mit den meisten Systemen – von D&D 5e bis Cthulhu.",
  },
  {
    q: "Brauche ich Vorkenntnisse?",
    a: "Nein. Der Einstieg ist bewusst einfach gehalten: Kampagne anlegen, Notizen strukturieren, Spieler einladen – fertig.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 bg-background-dark">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8">
            Häufige Fragen
          </h2>

          <div className="mt-8 space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-md border border-hero-border/40 bg-background-card p-5 shadow-lg"
              >
                <summary className="cursor-pointer list-none font-barlow font-bold uppercase text-hero-vibrant">
                  {item.q}
                </summary>
                <p className="mt-3 font-libre text-gray-200 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          <p className="mt-10 font-libre text-gray-200 leading-relaxed text-sm">
            Du hast noch Fragen? Schreib uns – wir bauen TableHeroes gemeinsam
            mit der Community.
          </p>
        </motion.div>
      </div>
    </section>
  );
}




