export type LoreOverviewItem = {
  id: string;
  name: string;
  type: string;
};

export type LoreOverviewCultureGroup = {
  culture: LoreOverviewItem;
  races: LoreOverviewItem[];
};

export type LoreOverviewSection = {
  id: string;
  label: string;
  /** Flache Liste (z. B. Sprachen, Geschichte) */
  entries: LoreOverviewItem[];
  /** Kulturen mit zugeordneten Rassen */
  cultureGroups?: LoreOverviewCultureGroup[];
  /** Rassen ohne Kulturzuordnung */
  orphanRaces?: LoreOverviewItem[];
};

export type LoreOverviewSourceEntry = {
  id: string;
  name: string;
  type: string;
  culture_id?: string | null;
  race_ids?: string[] | null;
  description?: string | null;
};

function toItem(entry: LoreOverviewSourceEntry): LoreOverviewItem {
  return { id: entry.id, name: entry.name, type: entry.type };
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

function buildCultureSection(entries: LoreOverviewSourceEntry[]): Pick<
  LoreOverviewSection,
  "cultureGroups" | "orphanRaces" | "entries"
> | null {
  const cultures = sortByName(entries.filter((e) => e.type === "Kultur"));
  const races = sortByName(entries.filter((e) => e.type === "Rasse"));
  if (cultures.length === 0 && races.length === 0) return null;

  const raceToCulture = new Map<string, string>();
  for (const culture of cultures) {
    for (const raceId of culture.race_ids ?? []) {
      if (raceId?.trim()) raceToCulture.set(raceId.trim(), culture.id);
    }
  }
  for (const race of races) {
    if (race.culture_id?.trim() && !raceToCulture.has(race.id)) {
      raceToCulture.set(race.id, race.culture_id.trim());
    }
  }

  const cultureGroups: LoreOverviewCultureGroup[] = cultures.map((culture) => ({
    culture: toItem(culture),
    races: sortByName(
      races
        .filter((race) => raceToCulture.get(race.id) === culture.id)
        .map(toItem),
    ),
  }));

  const assignedRaceIds = new Set(
    cultureGroups.flatMap((group) => group.races.map((race) => race.id)),
  );
  const orphanRaces = sortByName(
    races.filter((race) => !assignedRaceIds.has(race.id)).map(toItem),
  );

  return { entries: [], cultureGroups, orphanRaces };
}

/** Baut die Kategorie-Übersicht für die Welt-Lore-Liste. */
export function buildLoreOverviewSections(
  entries: LoreOverviewSourceEntry[],
): LoreOverviewSection[] {
  const sections: LoreOverviewSection[] = [];

  const culturePart = buildCultureSection(entries);
  if (culturePart) {
    sections.push({
      id: "culture",
      label: "Kulturen & Völker",
      ...culturePart,
    });
  }

  const languages = sortByName(entries.filter((e) => e.type === "Sprache").map(toItem));
  if (languages.length > 0) {
    sections.push({
      id: "languages",
      label: "Sprachen",
      entries: languages,
    });
  }

  const deities = sortByName(entries.filter((e) => e.type === "Gottheit").map(toItem));
  const religions = sortByName(entries.filter((e) => e.type === "Religion").map(toItem));
  if (deities.length > 0 || religions.length > 0) {
    sections.push({
      id: "religion",
      label: "Religion & Glaube",
      entries: [...deities, ...religions],
    });
  }

  const history = sortByName(
    entries
      .filter((e) =>
        ["Geschichten & Legenden", "Ereignis", "Mythos"].includes(e.type),
      )
      .map(toItem),
  );
  if (history.length > 0) {
    sections.push({
      id: "history",
      label: "Geschichte & Legenden",
      entries: history,
    });
  }

  const magic = sortByName(
    entries.filter((e) => ["Magie", "Artefakt"].includes(e.type)).map(toItem),
  );
  if (magic.length > 0) {
    sections.push({
      id: "magic",
      label: "Magie & Artefakte",
      entries: magic,
    });
  }

  const organizations = sortByName(
    entries.filter((e) => e.type === "Regierung").map(toItem),
  );
  if (organizations.length > 0) {
    sections.push({
      id: "organization",
      label: "Regierung & Organisationen",
      entries: organizations,
    });
  }

  const knownTypes = new Set([
    "Kultur",
    "Rasse",
    "Sprache",
    "Gottheit",
    "Religion",
    "Geschichten & Legenden",
    "Ereignis",
    "Mythos",
    "Magie",
    "Artefakt",
    "Regierung",
  ]);
  const other = sortByName(
    entries.filter((e) => !knownTypes.has(e.type)).map(toItem),
  );
  if (other.length > 0) {
    sections.push({
      id: "other",
      label: "Sonstiges",
      entries: other,
    });
  }

  return sections;
}

export function countLoreOverviewItems(section: LoreOverviewSection): number {
  const cultureCount =
    (section.cultureGroups?.length ?? 0) +
    (section.cultureGroups?.reduce((sum, g) => sum + g.races.length, 0) ?? 0) +
    (section.orphanRaces?.length ?? 0);
  return section.entries.length + cultureCount;
}
