import { isLocationType, LOCATION_TYPES } from "@/src/lib/lore-types";

export type LoreOverviewItem = {
  id: string;
  name: string;
  type: string;
  created_at?: string | null;
  is_favorite?: boolean;
  has_recent_secret?: boolean;
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
  created_at?: string | null;
  is_favorite?: boolean;
  has_recent_secret?: boolean;
  /** Kampagnen-Sichtbarkeit (campaign_visibility.is_revealed) */
  is_revealed?: boolean;
};

export type BuildLoreOverviewOptions = {
  /** all = Lore + Orte, lore = nur Lore-Kategorien, locations = nur Ortsbaum */
  scope?: "all" | "lore" | "locations";
  /** Nur Einträge mit is_revealed === true (Kampagnen-Spieleransicht) */
  onlyRevealed?: boolean;
};

function filterRevealedSourceEntries(
  entries: LoreOverviewSourceEntry[],
  onlyRevealed: boolean,
): LoreOverviewSourceEntry[] {
  if (!onlyRevealed) return entries;
  return entries.filter((entry) => entry.is_revealed === true);
}

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
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    created_at: entry.created_at ?? null,
    is_favorite: entry.is_favorite === true,
    has_recent_secret: entry.has_recent_secret === true,
  };
}

export function isLoreOverviewItemNew(item: LoreOverviewItem): boolean {
  if (!item.created_at) return false;
  return (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60) < 48;
}

export function isLoreOverviewItemUpdate(item: LoreOverviewItem): boolean {
  if (isLoreOverviewItemNew(item)) return false;
  return item.has_recent_secret === true;
}

function sortOverviewItems(items: LoreOverviewItem[]): LoreOverviewItem[] {
  return [...items].sort((a, b) => {
    const aHighlight = isLoreOverviewItemNew(a) || isLoreOverviewItemUpdate(a);
    const bHighlight = isLoreOverviewItemNew(b) || isLoreOverviewItemUpdate(b);
    if (aHighlight !== bHighlight) return aHighlight ? -1 : 1;
    return a.name.localeCompare(b.name, "de");
  });
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
    races: sortOverviewItems(
      races
        .filter((race) => raceToCulture.get(race.id) === culture.id)
        .map(toItem),
    ),
  }));

  const assignedRaceIds = new Set(
    cultureGroups.flatMap((group) => group.races.map((race) => race.id)),
  );
  const orphanRaces = sortOverviewItems(
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

function sortLocationNodes(nodes: LoreOverviewLocationNode[]): LoreOverviewLocationNode[] {
  const sortedItems = sortOverviewItems(nodes.map((node) => node.item));
  return sortedItems.map((item) => {
    const node = nodes.find((entry) => entry.item.id === item.id)!;
    return {
      item,
      children: sortLocationNodes(node.children),
    };
  });
}

function buildLocationSection(
  entries: LoreOverviewSourceEntry[],
): Pick<LoreOverviewSection, "locationTree" | "entries"> | null {
  const locations = entries.filter((entry) => isLocationType(entry.type));
  if (locations.length === 0) return null;

  return {
    entries: [],
    locationTree: sortLocationNodes(buildLocationTree(locations)),
  };
}

/** Baut die Kategorie-Übersicht für die Welt-Lore-Liste. */
export function buildLoreOverviewSections(
  entries: LoreOverviewSourceEntry[],
  options: BuildLoreOverviewOptions = {},
): LoreOverviewSection[] {
  const scope = options.scope ?? "all";
  const onlyRevealed = options.onlyRevealed === true;
  const visibleEntries = filterRevealedSourceEntries(entries, onlyRevealed);
  const sections: LoreOverviewSection[] = [];

  if (scope !== "lore") {
    const locationPart = buildLocationSection(visibleEntries);
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

  const culturePart = buildCultureSection(visibleEntries);
  if (culturePart) {
    sections.push({
      id: "culture",
      label: "Kulturen & Völker",
      ...culturePart,
    });
  }

  const languages = sortOverviewItems(
    visibleEntries.filter((e) => e.type === "Sprache").map(toItem),
  );
  if (languages.length > 0) {
    sections.push({
      id: "languages",
      label: "Sprachen",
      entries: languages,
    });
  }

  const deities = sortOverviewItems(visibleEntries.filter((e) => e.type === "Gottheit").map(toItem));
  const religions = sortOverviewItems(visibleEntries.filter((e) => e.type === "Religion").map(toItem));
  if (deities.length > 0 || religions.length > 0) {
    sections.push({
      id: "religion",
      label: "Religion & Glaube",
      entries: [...deities, ...religions],
    });
  }

  const history = sortOverviewItems(
    visibleEntries
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

  const magic = sortOverviewItems(
    visibleEntries.filter((e) => ["Magie", "Artefakt"].includes(e.type)).map(toItem),
  );
  if (magic.length > 0) {
    sections.push({
      id: "magic",
      label: "Magie & Artefakte",
      entries: magic,
    });
  }

  const organizations = sortOverviewItems(
    visibleEntries.filter((e) => e.type === "Regierung").map(toItem),
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
  const other = sortOverviewItems(
    visibleEntries.filter((e) => !knownTypes.has(e.type)).map(toItem),
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

export function countLoreOverviewNewItems(section: LoreOverviewSection): number {
  const countItems = (items: LoreOverviewItem[]) =>
    items.filter((item) => isLoreOverviewItemNew(item) || isLoreOverviewItemUpdate(item)).length;

  const cultureCount =
    (section.cultureGroups?.reduce(
      (sum, group) =>
        sum +
        countItems([group.culture]) +
        countItems(group.races),
      0,
    ) ?? 0) + countItems(section.orphanRaces ?? []);

  const locationCount = (nodes: LoreOverviewLocationNode[]): number =>
    nodes.reduce(
      (sum, node) =>
        sum +
        countItems([node.item]) +
        locationCount(node.children),
      0,
    );

  return (
    countItems(section.entries) +
    cultureCount +
    (section.locationTree ? locationCount(section.locationTree) : 0)
  );
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
