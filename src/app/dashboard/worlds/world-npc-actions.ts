/**
 * world-npc-actions — barrel re-export (see ./world-npc-actions/ with "use server").
 */

export type { GenerateNPCOptions, GeneratedNPCResult, RerollSection, NPCRelationSuggestion, NPCFactionRelationSuggestion, BriefingMapping, BriefingNewEntity, ProcessBriefingResult } from "./world-npc-actions/part-01";
export {
  buildBlueprintContext,
  loadWorldAndAuth,
  generateNPC,
  generateNPCForWorld,
  regenerateNPCSection,
  generateNPCRelation,
  generateNPCFactionRelation
} from "./world-npc-actions/part-01";
export type { GenerateNPCPortraitInput } from "./world-npc-actions/part-02";
export {
  processBriefing,
  generateNPCPortrait,
  getWorldNPCsForRelations,
  generateNpcCombatSheet
} from "./world-npc-actions/part-02";
