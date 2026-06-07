"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    q: "Kan man sich nur für Online Runden bewerben?",
    a: "Nein, es gibt auch Präsenz Runden die ausschließlich in Osnabrück stattfinden. Diese Runden sind aber limitiert und werden bevorzugt an Mitglieder vergeben die auch Online Runden leiten oder spielen.",
  },
  {
    q: "Für wen ist Table-Heroes gedacht?",
    a: "Die Table-Heroes Webseite mit Ihrem Dashboard ist für Mitglieder von Table-Heroes gedacht um ihre Runden besser zu organiseren, Spielleiter eine Möglichkeit zu geben sich mit Spielern Online auszutauschen und Spielern zusätzliche Anreize zu schaffen an Runden teilzunehmen.",
  },
  {
    q: "Kann ich direkt mich für Runden anmelden?",
    a: "Es gibt offene Runden die zum kennenlernen gedacht sind. Um an einer festen bestehenden Runde teilzunehmen muss man sich registrieren und bewerben",
  },
  {
    q: "Entstehen mir als Mitglied kosten oder muss ich mich irgendwozu verpflichten?",
    a: "Es gibt keine weiteren Kosten, du kannst aber gerne jederzeit eine Spende für das Team einreichen. Die einzige Pflicht die Du als Mitglied hast ist eine Teilnahme an zugesagten Terminen",
  },
  {
    q: "Erstellt die KI komplette Inhalte und Geschichten?",
    a: "Die KI ist für Spieler und Spielleiter ein Werkzeug und soll Euch helfen schnell Infos zu finden und Inspirationen zu geben. Die KI gibt Euch wichtige Bausteine und achtet darauf, dass alles sinnvoll miteinander verknüpft ist. Als SL oder Spieler entscheidet ihr wie und was ihr spielt ... niemals die KI!",
  },
  {
    q: "Kann ich mich auch als Spielleiter registrierenn?",
    a: "Vorab musst du dich als Mitglied registrieren und kannst dich dann als SL über Discord bewerben. Dann erhälst du eine seperaten Zugang für den SL Dashboard.",
  },
];

function FaqItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
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
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-4" style={{ zIndex: 4 }}>
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
        <div>
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="marketing-section-h2"
            >
              Häufige Fragen
            </motion.h2>
          </div>

          <div className="mt-8 space-y-3">
            {faqs.map((item, index) => (
              <FaqItem
                key={item.q}
                question={item.q}
                answer={item.a}
                index={index}
              />
            ))}
          </div>

          <p className="mt-10 font-libre text-gray-200 leading-relaxed text-sm">
            Du hast noch Fragen? Schreib uns – wir bauen TableHeroes gemeinsam
            mit der Community.
          </p>
        </div>
      </div>

      {/* Goldene, sich wiederholende Border unten */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4" style={{ zIndex: 4 }}>
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
