"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Share2,
  Sliders,
  Zap,
  ScrollText,
  Shield,
  Search,
  Gem,
  PenTool,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

type TabKey = "gm" | "player";

type FeatureCard = {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

function Card({ title, description, Icon }: FeatureCard) {
  return (
    <div className="rounded-md border border-hero-border/40 bg-background-card p-6 shadow-lg">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-hero-border/40 bg-background-dark">
          <Icon className="h-5 w-5 text-accent-gold" aria-hidden />
        </div>
        <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-0">
          {title}
        </h3>
      </div>
      <p className="font-libre text-gray-200 leading-relaxed">{description}</p>
    </div>
  );
}

export function FeatureTabsSection() {
  const [tab, setTab] = useState<TabKey>("gm");

  const gmCards: FeatureCard[] = useMemo(
    () => [
      {
        title: "Beziehungen und Abhängikeiten visualisieren",
        description:
          "Wer zieht die Fäden? Mach Fraktionen, Rivalitäten und Intrigen sichtbar, statt sie in Textblöcken zu vergraben. Entscheide welcher Spieler was sieht und welche Geheimnisse wer aufgedeckt hat.",
        Icon: Share2,
      },
      {
        title: "Lore-basierte KI-Unterstützung",
        description:
          "Brauchst du schnell eine neue Gilde oder einen Rivalen? Lass dir von der KI helfen schnell die wichtigsten Fakten zu sammeln um die passende Story zu entwickeln.",
        Icon: Sparkles,
      },
      {
        title: "Volle Kontrolle für Deine Vision und Deiner Geschichte",
        description:
          "Die KI generiert Dir keine Inhalte. Die KI liefert den Rohbau für NPCs oder Orte, schafft Verknüpfungen und visualsiert sie – du übernimmst den Feinschliff für deine Vision.",
        Icon: Sliders,
      },
      {
        title: "Szenen-Support für lebendige Spielwelten",
        description:
          "Bereite die Stimmung vor. Wenn die Spieler einen Ort betreten, hast du sofort die passenden Beschreibungen und Geheimnisse parat - Auf dem Session Board positionierst Du den NPC und entscheidest was die Spieler sehen (und was nicht)",
        Icon: Zap,
      },
            {
        title: "Deine Welt, deine Lore und deine Regeln",
        description:
          "Erstellle Lore-Einträge samt Gehmeihmnisse, schaffe Verknüpfungen zwischen NPCs und Quests, erstelle einzigartige Orte mit passendem Bilder und das innerhalb von Minuten.",
        Icon: Zap,
      },
                  {
        title: "Die KI als dein Assistent",
        description:
          "Der KI-Assistent als wertvoller Helfer und Inspiration. Schnelle Vorschläge, richtige Impulse und schnelle Umsetzung Deiner Ideen. Direkt Sichtbar (oder auch nicht) für Deine Spieler.",
        Icon: Zap,
      },
    ],
    [],
  );

  const playerCards: FeatureCard[] = useMemo(
    () => [
      {
        title: "Das Netz verstehen",
        description:
          "Behalte den Durchblick im Ränkespiel. Sieh auf einen Blick, wie NPCs und Fraktionen zueinander stehen.",
        Icon: Search,
      },
      {
        title: "Story-Items & Loot",
        description:
          "Nicht nur Stats, sondern Geschichte. Notiere dir Legenden zu deinen Fundstücken und was sie für deinen Charakter bedeuten.",
        Icon: Gem,
      },
      {
        title: "Intelligente Notizen",
        description:
          "Verknüpfe deine Mitschriften direkt mit Personen und Orten. So findest du später sofort wieder, wer der 'Typ mit der Narbe' war.",
        Icon: PenTool,
      },
      {
        title: "Dein persönlicher Fokus",
        description:
          "Konzentriere dich auf das Rollenspiel. Foundry regelt die Zahlen, TableHeroes hält dir den Rücken frei für die Story.",
        Icon: UserCheck,
      },
    ],
    [],
  );

  const activeCards = tab === "gm" ? gmCards : playerCards;

  return (
    <section
      id="features"
      className="relative scroll-mt-20 bg-background-dark"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8">
            Unsere Vereins-Plattform
          </h2>
          <p className="font-libre text-gray-200 leading-relaxed">
            Foundry macht die Maps und Würfelwürfe. TableHeroes macht die Connections und liefert kreative Impulse. 
            Zusammen entsteht ein Erlebnis, das Zahlen und Story perfekt verbindet.
          </p>

          {/* Toggle */}
          <div className="mt-8 flex justify-center">
            <div className="relative flex w-full max-w-xl rounded-full border border-hero-border/50 bg-background-card p-1 shadow-lg">
              <button
                type="button"
                onClick={() => setTab("gm")}
                className={[
                  "relative z-10 flex w-1/2 items-center justify-center gap-2 rounded-full px-4 py-3",
                  "font-barlow font-bold uppercase transition-colors",
                  tab === "gm" ? "text-white" : "text-gray-400 hover:text-gray-200",
                ].join(" ")}
                aria-pressed={tab === "gm"}
              >
                <ScrollText className="h-4 w-4" aria-hidden />
                Für Spielleiter
              </button>
              <button
                type="button"
                onClick={() => setTab("player")}
                className={[
                  "relative z-10 flex w-1/2 items-center justify-center gap-2 rounded-full px-4 py-3",
                  "font-barlow font-bold uppercase transition-colors",
                  tab === "player"
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200",
                ].join(" ")}
                aria-pressed={tab === "player"}
              >
                <Shield className="h-4 w-4" aria-hidden />
                Für Spieler
              </button>

              <motion.div
                layoutId="feature-tabs-pill"
                className={[
                  "absolute top-1 bottom-1 w-1/2 rounded-full bg-hero-vibrant",
                  "shadow-[0_0_0_1px_rgba(35,199,99,0.35)]",
                ].join(" ")}
                initial={false}
                animate={{ x: tab === "gm" ? "0%" : "100%" }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                aria-hidden
              />
            </div>
          </div>

          {/* Content */}
          <div className="mt-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {/* Tab-specific Headline */}
                <h3 className="font-cinzel font-bold text-2xl text-accent-gold mb-6 text-center">
                  {tab === "gm" 
                    ? "Deine Welt. Lebendig und auf Abruf." 
                    : "Verbinde die Punkte. Löse das Rätsel."}
                </h3>

                {/* Cards Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {activeCards.map((c) => (
                    <Card key={c.title} {...c} />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
      {/* Goldene, sich wiederholende Border zwischen Sektionen */}
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


