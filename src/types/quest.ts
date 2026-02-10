export type QuestAnchor = {
  id: string;
  type: "npc_secret" | "npc_relation" | "faction" | "faction_rival" | "lore";
  label: string;
  summary: string;
};
