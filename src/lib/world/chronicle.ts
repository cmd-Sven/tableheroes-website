export type ChronicleBasis = "rechnung" | "gesetzt";

export type ChronicleEvent = {
  year: number;
  title: string;
  summary: string;
  basis: ChronicleBasis;
  image?: string;
};

export type ChronicleAge = {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  summary: string;
  events: ChronicleEvent[];
  /** Jahreszählung beginnt bei diesem Zeitalter wieder bei 0. */
  restartYear?: boolean;
};

export type WorldChronicle = {
  epoch: string;
  presentYear: number;
  presentLabel: string;
  ages: ChronicleAge[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseWorldChronicle(blueprint: unknown): WorldChronicle | null {
  if (!isRecord(blueprint) || !isRecord(blueprint.chronicle)) return null;
  const chronicle = blueprint.chronicle;
  if (typeof chronicle.epoch !== "string") return null;
  if (typeof chronicle.presentYear !== "number") return null;
  if (typeof chronicle.presentLabel !== "string") return null;
  if (!Array.isArray(chronicle.ages) || chronicle.ages.length === 0) return null;

  const ages: ChronicleAge[] = [];
  for (const age of chronicle.ages) {
    if (!isRecord(age)) return null;
    if (typeof age.id !== "string" || typeof age.name !== "string") return null;
    if (typeof age.startYear !== "number" || typeof age.endYear !== "number") return null;
    if (typeof age.summary !== "string" || !Array.isArray(age.events)) return null;
    const events: ChronicleEvent[] = [];
    for (const event of age.events) {
      if (!isRecord(event)) return null;
      if (typeof event.year !== "number" || typeof event.title !== "string") return null;
      if (typeof event.summary !== "string") return null;
      if (event.basis !== "rechnung" && event.basis !== "gesetzt") return null;
      events.push({
        year: event.year,
        title: event.title,
        summary: event.summary,
        basis: event.basis,
        ...(typeof event.image === "string" && event.image.length > 0
          ? { image: event.image }
          : {}),
      });
    }
    ages.push({
      id: age.id,
      name: age.name,
      startYear: age.startYear,
      endYear: age.endYear,
      summary: age.summary,
      events,
      restartYear: age.restartYear === true,
    });
  }

  return {
    epoch: chronicle.epoch,
    presentYear: chronicle.presentYear,
    presentLabel: chronicle.presentLabel,
    ages,
  };
}

/** Jahr im Zeitalter. Jedes Zeitalter beginnt bei 0. */
export function displayYear(age: ChronicleAge, year: number): number {
  return year - age.startYear;
}

/** Zeitalterjahr und, in Klammern, das Weltjahr seit der Geburt von Kassadras. */
export function yearLabel(age: ChronicleAge, year: number): string {
  return `Jahr ${displayYear(age, year)} (${year})`;
}

export function ageSpanLabel(age: ChronicleAge): string {
  return `Jahr 0 bis ${displayYear(age, age.endYear)} (${age.startYear}–${age.endYear})`;
}

export function ageForYear(chronicle: WorldChronicle, year: number): ChronicleAge | null {
  return (
    chronicle.ages.find((age) => year >= age.startYear && year <= age.endYear) ?? null
  );
}

export function nearestEvent(chronicle: WorldChronicle, year: number): ChronicleEvent | null {
  const events = chronicle.ages.flatMap((age) => age.events);
  if (events.length === 0) return null;
  return events.reduce((best, event) => {
    const distance = Math.abs(event.year - year);
    const bestDistance = Math.abs(best.year - year);
    return distance <= bestDistance ? event : best;
  });
}
