/** Bekannte world_lore-IDs für Vattrak-/Malanthir-Erz (Aurenfurt). */

export const VATTRAK_ORE_LORE_ID = "efd6ff44-b9d4-499f-932c-f89d790d5be5";
export const MALANTHIR_ORE_LORE_ID = "a9148c88-b68b-4730-bc2c-2d753018b06a";

export type ResourceLoreCard = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
};

export const RESOURCE_LORE_FALLBACK: Record<"vattrak" | "malanthir", ResourceLoreCard> = {
  vattrak: {
    id: VATTRAK_ORE_LORE_ID,
    name: "Vattrak Erz",
    description:
      "Seltene Ressource Kassadras’, mit der Magie gewirkt wird. Die Stadt lagert und verteilt das Erz nach strenger Priorität.",
    imageUrl: "https://i.pinimg.com/736x/17/ba/56/17ba5609aa600ecb5e4583b3684b0b91.jpg",
  },
  malanthir: {
    id: MALANTHIR_ORE_LORE_ID,
    name: "Malanthir Erz",
    description:
      "Dunkle Gegenkraft zum Vattrak — mit Malaghor verbunden. Knappheit an Vattrak lässt Malanthir und Unruhe in den Gassen wachsen.",
    imageUrl: "https://i.pinimg.com/736x/4e/2f/28/4e2f28606bf64e947dd93c4367af506e.jpg",
  },
};
