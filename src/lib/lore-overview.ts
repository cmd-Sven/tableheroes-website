import { isLocationType, LOCATION_TYPES } from "@/src/lib/lore-types";

export type LoreOverviewItem = {
  id: string;
  name: string;
  type: string;
};

export type LoreOverviewCultureGroup = {
  culture: LoreOverviewItem;
  races: LoreOverviewItem[];
};

export type LoreOverviewLocationNode = {
  item: LoreOverviewItem;
  children: LoreOverviewLocationNode[];
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
  /** Geografische Hierarchie (Region → Stadt → …) */
  locationTree?: LoreOverviewLocationNode[];
};

export type LoreOverviewSourceEntry = {
  id: string;
  name: string;
  type: string;
  parent_id?: string | null;
  culture_id?: string | null;
  race_ids?: string[] | null;
  description?: string | null;
};

export type BuildLoreOverviewOptions = {
  /** all = Lore + Orte, lore = nur Lore-Kategorien, locations = nur Ortsbaum */
  scope?: "all" | "lore" | "locations";
};

const LOCATION_TYPE_SORT: Record<string, number> = {
  Land: 0,
  Region: 1,
  Insel: 2,
  Gebiet: 3,
  Stadt: 4,
  Ort: 5,
  Dorf: 6,
  Stadtteil: 7,
  Gebäude: 8,
  Tempel: 9,
  Kathedrale: 10,
  Akademie: 11,
  Taverne: 12,
  Kaserne: 13,
  Kontor: 14,
  Hafen: 15,
  Schmiede: 16,
  Geschäft: 17,
};

function locationSortKey(entry: LoreOverviewSourceEntry): [number, string] {
  const typeRank = LOCATION_TYPE_SORT[entry.type] ?? 99;
  return [typeRank, entry.name.toLocaleLowerCase("de")];
}

function sortLocations(entries: LoreOverviewSourceEntry[]): LoreOverviewSourceEntry[] {
  return [...entries].sort((a, b) => {
    const [ra, na] = locationSortKey(a);
    const [rb, nb] = locationSortKey(b);
    if (ra !== rb) return ra - rb;
    return na.localeCompare(nb, "de");
  });
}

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

function buildLocationTree(
  locations: LoreOverviewSourceEntry[],
): LoreOverviewLocationNode[] {
  const byId = new Map(locations.map((entry) => [entry.id, entry]));
  const childrenByParent = new Map<string, LoreOverviewSourceEntry[]>();

  for (const location of locations) {
    const parentKey =
      location.parent_id && byId.has(location.parent_id)
        ? location.parent_id
        : "";
    if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
    childrenByParent.get(parentKey)!.push(location);
  }

  const buildNode = (entry: LoreOverviewSourceEntry): LoreOverviewLocationNode => ({
    item: toItem(entry),
    children: sortLocations(childrenByParent.get(entry.id) ?? []).map(buildNode),
  });

  return sortLocations(childrenByParent.get("") ?? []).map(buildNode);
}

function buildLocationSection(
  entries: LoreOverviewSourceEntry[],
): Pick<LoreOverviewSection, "locationTree" | "entries"> | null {
  const locations = entries.filter((entry) => isLocationType(entry.type));
  if (locations.length === 0) return null;

  return {
    entries: [],
    locationTree: buildLocationTree(locations),
  };
}

/** Baut die Kategorie-Übersicht für die Welt-Lore-Liste. */
export function buildLoreOverviewSections(
  entries: LoreOverviewSourceEntry[],
  options: BuildLoreOverviewOptions = {},
): LoreOverviewSection[] {
  const scope = options.scope ?? "all";
  const sections: LoreOverviewSection[] = [];

  if (scope !== "lore") {
    const locationPart = buildLocationSection(entries);
    if (locationPart) {
      sections.push({
        id: "locations",
        label: "Orte & Regionen",
        ...locationPart,
      });
    }
  }

  if (scope === "locations") {
    return sections;
  }

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
    ...LOCATION_TYPES,
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
  const countLocationNodes = (nodes: LoreOverviewLocationNode[]): number =>
    nodes.reduce((sum, node) => sum + 1 + countLocationNodes(node.children), 0);

  const cultureCount =
    (section.cultureGroups?.length ?? 0) +
    (section.cultureGroups?.reduce((sum, g) => sum + g.races.length, 0) ?? 0) +
    (section.orphanRaces?.length ?? 0);
  const locationCount = section.locationTree ? countLocationNodes(section.locationTree) : 0;
  return section.entries.length + cultureCount + locationCount;
}
