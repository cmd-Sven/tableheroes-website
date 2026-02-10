"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Share2,
  Sliders,
  ScrollText,
  Shield,
  Search,
  Gem,
  PenTool,
  Sparkles,
  MapPin,
  Globe,
  Bot,
  Target,
  LayoutDashboard,
  Award,
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
    <motion.div
      className="group relative rounded-md shadow-lg overflow-hidden cursor-pointer min-h-[280px]"
      whileHover={{ scale: 1.03, y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {/* Dark Hintergrund */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage: "url('/images/dark-bg.webp')",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />
      {/* Dark Hover Hintergrund */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-90 transition-opacity duration-300"
        style={{
          backgroundImage: "url('/images/dark-bg-hover.webp')",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />
      <div className="relative p-[65px]">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md border border-amber-800/40 bg-amber-50">
            <Icon className="h-5 w-5 text-amber-900" aria-hidden />
          </div>
          <h3 className="font-cinzel font-bold text-xl text-gray-300 mb-0">
            {title}
          </h3>
        </div>
        <p className="font-libre text-gray-300 leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
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
        Icon: MapPin,
      },
            {
        title: "Deine Welt, deine Lore und deine Regeln",
        description:
          "Erstellle Lore-Einträge samt Gehmeihmnisse, schaffe Verknüpfungen zwischen NPCs und Quests, erstelle einzigartige Orte mit passendem Bilder und das innerhalb von Minuten.",
        Icon: Globe,
      },
                  {
        title: "Die KI als dein Assistent",
        description:
          "Der KI-Assistent als wertvoller Helfer und Inspiration. Schnelle Vorschläge, richtige Impulse und schnelle Umsetzung Deiner Ideen. Direkt Sichtbar (oder auch nicht) für Deine Spieler.",
        Icon: Bot,
      },
    ],
    [],
  );

  const playerCards: FeatureCard[] = useMemo(
    () => [
      {
        title: "Das wichtigste im Auge behalten",
        description:
          "Behalte den Durchblick im Ränkespiel. Sieh auf einen Blick, wie NPCs und Fraktionen zueinander stehen. Wenn du erfolgreich Informationen erwüfelt hast kannst du diese Infos jederzeit wieder abrufen (oder für Dich behalten)",
        Icon: Search,
      },
      {
        title: "Deine Geschichte und BEziehungen festhalten",
        description:
          "Die Geschichte eines Charakters lebt von seinen Beziehungen. Halte fest, wer Freund, Feind oder einfach nur Bekannt ist – und wie sich diese Beziehungen im Laufe der Kampagne entwickeln.",
        Icon: Gem,
      },
      {
        title: "Intelligente Notizen",
        description:
          "Verknüpfe deine Mitschriften direkt mit Personen und Orten. So findest du später sofort wieder, wer der 'Typ mit der Narbe' war. Teile Deine Infos bequem mit deinen Mitspielern.",
        Icon: PenTool,
      },
      {
        title: "Dein persönlicher Fokus",
        description:
          "Konzentriere dich auf das Rollenspiel. Löse Rätsel, entscheide welche Information nur für Dich ist, hüte Geheimnisse und entdecke versteckte Verbindungen in der Kampagne.",
        Icon: Target,
      },
            {
        title: "Dein eigenes Dashboard",
        description:
          "Punkte, Achievements, Downloads udn wichtige Links für die nächste Kamapgne .... alles auf einen Blick",
        Icon: LayoutDashboard,
      },
                 {
        title: "Entwickle Dein Spielerlevel und werde zum Mentor",
        description:
          "Du willst anderen helfen, Dich für bestimmte Rollen ausschreiben oder einfach nur Dich mit der Community austauschen? Zeige Deine Entwicklung und Erfahrung über Dein Spielerprofil.",
        Icon: Award,
      },
    ],
    [],
  );

  const activeCards = tab === "gm" ? gmCards : playerCards;

  return (
    <section
      id="features"
      className="relative scroll-mt-20 bg-background-dark"
      style={{
        backgroundImage: "url('/images/dark-marmor.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div>
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8 inline-block"
            >
              Individuelles Dashboard für SL &amp; Spieler
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-libre text-gray-200 leading-relaxed text-center max-w-3xl mx-auto"
          >
            Nutze als SL mächtige Werkzeuge um Deine Lore, Quests, NPCs, Locations und vieles mehr aufzubauen. 
            Als Spieler kannst du dein Dashboard mit wichtigen Infos zur Kampagne selber aufbauen. 
            Verliere nie wieder den Roten Faden.
          </motion.p>

          {/* Toggle */}
          <div className="mt-8 flex justify-center">
            <div className="relative flex w-full max-w-xl rounded-full border border-hero-border/60 bg-background-card/90 p-1 shadow-lg">
              <button
                type="button"
                onClick={() => setTab("gm")}
                className={[
                  "relative z-10 flex w-1/2 items-center justify-center gap-2 rounded-full px-4 py-3",
                  "font-barlow font-bold uppercase transition-colors",
                  tab === "gm"
                    ? "text-stone-900"
                    : "text-gray-400 hover:text-gray-200",
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
                    ? "text-stone-900"
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
                  "absolute top-1 bottom-1 w-1/2 rounded-full bg-accent-gold bg-[#cab926]",
                  "shadow-[0_0_18px_rgba(202,185,38,0.55)]",
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
        </div>
      </div>
      {/* Goldene, sich wiederholende Border zwischen Sektionen */}
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


