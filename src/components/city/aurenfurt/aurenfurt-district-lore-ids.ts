import type { CityDistrictId } from "./aurenfurt-districts";

/** world_lore / locations UUIDs der Aurenfurt-Stadtteile. */
export const AURENFURT_DISTRICT_LORE_IDS: Record<CityDistrictId, string> = {
  adelsviertel: "7a7b969e-cb22-4bc6-9356-4119442986fe",
  akademieviertel: "ac085f28-1167-4a29-9494-074f3ce61012",
  handwerkerviertel: "38c8a9fc-75cb-41fc-a8fc-4fa98996bf1a",
  palast: "c1afce7e-5c4b-4fef-8654-818ef0534993",
  suedtor: "a0a973ce-e497-48f9-87cf-75cad40e8ea3",
  tempelbezirk: "404d414c-7005-43b9-979a-077ea531177d",
  unterstadt: "334d42e3-d15c-488a-9ae0-213ec914ba12",
};

const LORE_ID_TO_DISTRICT = Object.fromEntries(
  Object.entries(AURENFURT_DISTRICT_LORE_IDS).map(([districtId, loreId]) => [loreId, districtId]),
) as Record<string, CityDistrictId>;

export function districtIdFromLoreId(loreId: string | null | undefined): CityDistrictId | null {
  if (!loreId) return null;
  return LORE_ID_TO_DISTRICT[loreId] ?? null;
}

export function loreIdFromDistrictId(districtId: CityDistrictId): string {
  return AURENFURT_DISTRICT_LORE_IDS[districtId];
}

export const AURENFURT_WORLD_ID = "689a0f11-7aa3-440b-9527-c6da0a84aebb";
export const LORE_PLACEHOLDER_IMAGE = "/images/lore/ort-platzhalter.png";
