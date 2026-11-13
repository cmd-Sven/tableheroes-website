import { AURENFURT_WORLD_ID } from "./aurenfurt-district-lore-ids";

/** Feste Lore-UUIDs für den Demo-FAQ des Daten-Wirts (Welt Aurenfurt). */
export const BARNABAS_LORE_IDS = {
  worldId: AURENFURT_WORLD_ID,
  /** Kultur-Eintrag „Elfenkultur“ */
  elfenKultur: "27379e02-477c-4b34-a2ad-0fddb3133486",
  /** Rasse „Hochelfen“ */
  hochelfen: "679c18de-e56a-4bfe-921f-55f3cb547e6a",
  /** Gebäude / Lore „Große Schmiede“ */
  grosseSchmiede: "9385dd5a-2e4f-4bc4-ad96-2d73949df1a0",
  /** Laden „Offene Esse Hauerkopf“ */
  offeneEsse: "aaf10001-0001-4000-8000-000000000002",
  /** Fraktion „Das rote Auge“ */
  rotesAuge: "d7881e53-c195-6a9b-0f27-7a661916f0cb",
} as const;

export type BarnabasLinkKind = "lore" | "faction" | "location";

export type BarnabasLoreLink = {
  label: string;
  kind: BarnabasLinkKind;
  entryId: string;
};

export type BarnabasFaqMatch = {
  id: string;
  reply: string;
  links: BarnabasLoreLink[];
};

const FAQ_ENTRIES: Array<{
  id: string;
  keywords: string[];
  reply: string;
  links: BarnabasLoreLink[];
}> = [
  {
    id: "elfen",
    keywords: ["elf", "elfen", "hochelf", "mondelf", "smaragdelf", "halbelf", "feyelf", "alben"],
    reply:
      "Ah, die spitzohrigen Gäste — in Kassadras beginnt alles bei den Hochelfen und der Elfenkultur. Lies das erst, bevor du mit einem Mondelfen um Wein streitest.",
    links: [
      { label: "Elfenkultur", kind: "lore", entryId: BARNABAS_LORE_IDS.elfenKultur },
      { label: "Hochelfen", kind: "lore", entryId: BARNABAS_LORE_IDS.hochelfen },
    ],
  },
  {
    id: "schmied",
    keywords: ["schmied", "schmiede", "esse", "hammer", "waffe schmieden", "rüstung"],
    reply:
      "Einen ordentlichen Hammer hörst du am besten bei der Großen Schmiede — und wenn’s heiß und laut sein soll, schau bei der Offenen Esse Hauerkopf vorbei.",
    links: [
      { label: "Große Schmiede", kind: "location", entryId: BARNABAS_LORE_IDS.grosseSchmiede },
      { label: "Offene Esse Hauerkopf", kind: "location", entryId: BARNABAS_LORE_IDS.offeneEsse },
    ],
  },
  {
    id: "untergrund",
    keywords: [
      "untergrund",
      "unterwelt",
      "schatten",
      "dieb",
      "schurke",
      "rote gasse",
      "rotes auge",
      "rote auge",
      "kriminell",
      "mafia",
      "gilde der diebe",
    ],
    reply:
      "Unter der Theke flüstert man vom Roten Auge — Diebe, Schurken und korrupte Wachen. Frag nicht zu laut danach, wenn du den Abend noch genießen willst.",
    links: [
      { label: "Das rote Auge", kind: "faction", entryId: BARNABAS_LORE_IDS.rotesAuge },
    ],
  },
];

const FALLBACK_REPLY =
  "Darüber hab ich noch nichts hinter der Theke … frag’s anders, oder nenn Fraktion, Ort oder Volk.";

function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .trim();
}

export function buildBarnabasHref(
  worldId: string,
  link: BarnabasLoreLink,
): string {
  const wid = worldId || BARNABAS_LORE_IDS.worldId;
  if (link.kind === "faction") {
    return `/dashboard/worlds/${wid}/factions/${link.entryId}`;
  }
  if (link.kind === "location") {
    return `/dashboard/worlds/${wid}/locations/${link.entryId}`;
  }
  return `/dashboard/worlds/${wid}/lore/${link.entryId}`;
}

/** Keyword-Match für den Demo-FAQ. Kein Ranking — erster Treffer gewinnt. */
export function matchBarnabasLoreQuery(query: string): BarnabasFaqMatch {
  const q = normalizeQuery(query);
  if (!q) {
    return { id: "empty", reply: FALLBACK_REPLY, links: [] };
  }

  for (const entry of FAQ_ENTRIES) {
    if (entry.keywords.some((kw) => q.includes(normalizeQuery(kw)))) {
      return { id: entry.id, reply: entry.reply, links: entry.links };
    }
  }

  return { id: "fallback", reply: FALLBACK_REPLY, links: [] };
}

export const BARNABAS_DEMO_PROMPTS = [
  "Was muss ich zu Elfen wissen?",
  "Gibt es einen guten Schmied?",
  "Untergrundfraktion in Aurenfurt?",
] as const;
