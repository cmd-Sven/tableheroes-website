import Link from "next/link";
import { Sparkles, Users, BookOpen, Languages, Cpu } from "lucide-react";
import type { WorldBlueprint } from "@/src/types/world";

type Props = {
  worldId: string;
  worldName: string;
  blueprint: WorldBlueprint | null;
};

const TECH_LEVEL_ORDER = [
  "Steinzeit",
  "Bronzezeit",
  "Mittelalter",
  "Renaissance",
  "Industrialisierung",
  "Modern",
  "Near Future",
  "Interstellar",
] as const;

export function WorldRoadmap({ worldId, worldName, blueprint }: Props) {
  // Wenn Blueprint komplett leer ist, keine Roadmap anzeigen
  if (!blueprint) {
    return (
      <div className="mb-6 rounded-lg border border-hero-border/60 bg-background-card/60 p-4">
        <p className="font-libre text-sm text-gray-300">
          Starte den World Wizard, um den Blueprint dieser Welt zu definieren und eine Weltenbau-Roadmap zu erhalten.
        </p>
      </div>
    );
  }

  const tasks: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    icon: "pantheon" | "conflict" | "language" | "tech" | "magic" | "calendar" | "economy";
  }> = [];

  // Pantheon-Logik
  if (blueprint?.culture?.religion_type === "Pantheon") {
    tasks.push({
      id: "pantheon-gods",
      title: `Pantheon von ${worldName}`,
      description: "Das Pantheon wartet auf Namen, Domänen und heilige Symbole. Definiere 3–5 Hauptgötter.",
      href: `/dashboard/worlds/${worldId}/npcs/new?prefillRole=Gott`,
      icon: "pantheon",
    });
  }

  // Konflikt-Logik
  if (blueprint?.culture?.main_conflict) {
    tasks.push({
      id: "main-conflict",
      title: "Konflikt-Details ausarbeiten",
      description:
        "Der zentrale Konflikt ist definiert – jetzt braucht er Schauplätze, Fraktionen und Schlüsselszenen als Lore-Einträge.",
      href: `/dashboard/worlds/${worldId}/lore/new`,
      icon: "conflict",
    });

    // Platzhalter-Fraktionen A & B
    tasks.push({
      id: "conflict-faction-a",
      title: "Fraktion A des Konflikts",
      description:
        "Lege eine Fraktion an, die eine Seite des Hauptkonflikts verkörpert (z.B. Verteidiger der alten Ordnung).",
      href: `/dashboard/worlds/${worldId}/factions/new`,
      icon: "conflict",
    });
    tasks.push({
      id: "conflict-faction-b",
      title: "Fraktion B des Konflikts",
      description:
        "Lege die Gegenfraktion an (z.B. Revolutionäre, fremde Invasoren oder Anhänger einer neuen Religion).",
      href: `/dashboard/worlds/${worldId}/factions/new`,
      icon: "conflict",
    });
  }

  // Sprach-Logik
  if (blueprint?.culture?.language_base) {
    tasks.push({
      id: "language-entry",
      title: "Sprach-Eintrag erstellen",
      description:
        "Lege einen Lore-Eintrag zur Hauptsprache oder Sprachfamilie dieser Welt an (Schrift, Klang, Besonderheiten).",
      href: `/dashboard/worlds/${worldId}/lore/new`,
      icon: "language",
    });
  }

  // Kalender-Logik: Monatsnamen vorhanden -> Ereignis-Task für ersten Monat
  const monthsRaw = blueprint?.life_economy?.calendar_months || "";
  const monthTokens = monthsRaw
    .split(/[,;\n]/)
    .map((m) => m.trim())
    .filter(Boolean);
  const firstMonth = monthTokens[0];
  if (firstMonth) {
    tasks.push({
      id: "month-event",
      title: `Ereignis für den Monat "${firstMonth}"`,
      description:
        "Definiere ein jährliches Ereignis, Fest oder eine Tradition, die speziell mit diesem Monat verknüpft ist.",
      href: `/dashboard/worlds/${worldId}/lore/new`,
      icon: "calendar",
    });
  }

  // Tech-Check: alles über Mittelalter
  const techIndex = TECH_LEVEL_ORDER.indexOf((blueprint?.vibes?.tech_level ?? "") as any);
  const mittelalterIndex = TECH_LEVEL_ORDER.indexOf("Mittelalter");
  if (techIndex !== -1 && techIndex > mittelalterIndex) {
    tasks.push({
      id: "tech-faction",
      title: "Technologische Fraktion definieren",
      description:
        "Bei fortgeschrittener Technologie lohnt sich eine Fraktion, die Forschung, Industrie oder Megakonzerne repräsentiert.",
      href: `/dashboard/worlds/${worldId}/factions/new`,
      icon: "tech",
    });
  }

  // Magie-Check
  const magic = blueprint?.vibes?.magic_prevalence || "";
  if (
    magic.includes("Instabil") ||
    magic.includes("Chaotisch") ||
    magic.includes("Überall") ||
    magic.includes("Allgegenwärtig")
  ) {
    tasks.push({
      id: "magic-anomaly",
      title: "Magische Anomalie definieren",
      description:
        "Eine magische Anomalie (Ort, Phänomen oder Artefakt) macht die instabile/allgegenwärtige Magie für die Spieler direkt erlebbar.",
      href: `/dashboard/worlds/${worldId}/lore/new`,
      icon: "magic",
    });
  }

  // Währungs-Logik
  if (blueprint?.life_economy?.currency_name) {
    tasks.push({
      id: "economy-market",
      title: "Handelsgilde / Marktplatz ausarbeiten",
      description:
        "Die existierende Währung lädt dazu ein, eine Handelsgilde, einen Basar oder ein Finanzzentrum als Lore-Eintrag zu definieren.",
      href: `/dashboard/worlds/${worldId}/lore/new`,
      icon: "economy",
    });
  }

  // Feiertags-Logik
  if (blueprint?.life_economy?.holidays_summary) {
    tasks.push({
      id: "major-holiday",
      title: "Großen Feiertag ausarbeiten",
      description:
        "Wähle einen der beschriebenen Feiertage und mache ihn zu einem zentralen Szenen-Ort oder Plot-Hook (Lore-Eintrag).",
      href: `/dashboard/worlds/${worldId}/lore/new`,
      icon: "calendar",
    });
  }

  if (tasks.length === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-hero-border bg-background-card/80 p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-gold" />
          <h3 className="font-barlow font-bold text-sm uppercase text-accent-gold">
            Weltenbau-Roadmap
          </h3>
        </div>
        <p className="font-libre text-xs text-gray-400">
          Basierend auf deinem Welt-Blueprint.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-md border border-hero-border/60 bg-black/40 p-3 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              {task.icon === "pantheon" && (
                <Users className="h-4 w-4 text-accent-gold" />
              )}
              {task.icon === "conflict" && (
                <BookOpen className="h-4 w-4 text-accent-gold" />
              )}
              {task.icon === "language" && (
                <Languages className="h-4 w-4 text-accent-gold" />
              )}
              {task.icon === "tech" && (
                <Cpu className="h-4 w-4 text-accent-gold" />
              )}
              {task.icon === "magic" && (
                <Sparkles className="h-4 w-4 text-accent-gold" />
              )}
              {task.icon === "calendar" && (
                <BookOpen className="h-4 w-4 text-accent-gold" />
              )}
              {task.icon === "economy" && (
                <Cpu className="h-4 w-4 text-accent-gold" />
              )}
              <p className="font-barlow font-semibold text-xs uppercase text-gray-100">
                {task.title}
              </p>
            </div>
            <p className="font-libre text-xs text-gray-300 leading-relaxed">
              {task.description}
            </p>
            <div className="mt-1">
              <Link
                href={task.href}
                className="inline-flex items-center gap-1 rounded bg-hero-dark px-3 py-1.5 font-barlow font-bold text-[10px] uppercase text-white hover:bg-hero-vibrant transition-colors"
              >
                {task.icon === "pantheon" && "Göttliche NPCs erstellen"}
                {task.icon === "conflict" && "Konflikt-Lore/Fraktionen anlegen"}
                {task.icon === "language" && "Sprach-Lore anlegen"}
                {task.icon === "tech" && "Tech-Fraktion anlegen"}
                {task.icon === "magic" && "Magische Anomalie anlegen"}
                {task.icon === "calendar" && "Monats-Ereignis anlegen"}
                {task.icon === "economy" && "Handels-Lore anlegen"}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

