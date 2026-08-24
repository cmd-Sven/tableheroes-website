/**
 * Campaign AI generation server actions — barrel re-export.
 * Domain implementations live under ./ai-actions/* with "use server".
 */

export { generateShopItemsWithAI } from "./ai-actions/shop";
export { generateQuest, generateCharacterQuest } from "./ai-actions/quest";
export { generateSecret } from "./ai-actions/secret";
export { generateConspiracy } from "./ai-actions/conspiracy";
export { generateNPC, generateNpcDetailsFromHook } from "./ai-actions/npc";
export {
  analyzeWorldContext,
  analyzeBriefingForNPCs,
} from "./ai-actions/npc-analysis";
export {
  generateFaction,
  generateFactionForWorld,
  generateFactionDetails,
} from "./ai-actions/faction";
export { generateLore, generateLocationDetails } from "./ai-actions/lore";
export { generateSessionHook, generateNpcDetails } from "./ai-actions/session";
export {
  generateBackstorySuggestions,
  analyzeCharacterOnboarding,
} from "./ai-actions/character";
export { generateWorldSkeleton } from "./ai-actions/world";
