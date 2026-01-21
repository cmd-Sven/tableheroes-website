"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

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
  {
    q: "Erstellt die KI komplette Inhalte und Geschichten?",
    a: "Die KI ist für Spieler und Spielleiter ein Werkzeug und soll Euch helfen schnell Infos zu finden und Inspirationen zu geben. Die KI gibt Euch wichtige Bausteine und achtet darauf, dass alles sinnvoll miteinander verknüpft ist. Als SL oder Spieler entscheidet ihr wie und was ihr spielt ... niemals die KI!",
  },
];

function FaqItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      className="group rounded-md border border-hero-border/40 bg-emerald-950/80 p-5 shadow-lg"
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer list-none font-barlow font-bold uppercase text-hero-vibrant flex items-center justify-between gap-4">
        <span>{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-shrink-0"
        >
          <ChevronDown className="h-5 w-5 text-accent-gold" />
        </motion.div>
      </summary>
      <motion.p
        initial={false}
        animate={{ opacity: isOpen ? 1 : 0, height: isOpen ? "auto" : 0 }}
        transition={{ duration: 0.3 }}
        className="mt-3 font-libre text-gray-200 leading-relaxed overflow-hidden"
      >
        {answer}
      </motion.p>
    </details>
  );
}

export function FaqSection() {
  return (
    <section
      id="faq"
      className="relative scroll-mt-20 bg-background-dark"
      style={{
        backgroundImage: "url('/images/dark-marmor.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      {/* Goldene, sich wiederholende Border oben */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 z-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "url('/images/border_top-bottom_gold.png')",
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "top center",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16">
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
            {faqs.map((item, index) => (
              <FaqItem key={item.q} question={item.q} answer={item.a} index={index} />
            ))}
          </div>

          <p className="mt-10 font-libre text-gray-200 leading-relaxed text-sm">
            Du hast noch Fragen? Schreib uns – wir bauen TableHeroes gemeinsam
            mit der Community.
          </p>
        </motion.div>
      </div>

      {/* Goldene, sich wiederholende Border unten */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 z-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "url('/images/border_top-bottom_gold.png')",
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "bottom center",
          }}
        />
      </div>
    </section>
  );
}




