/**
 * npc-actions — barrel re-export (see ./npc-actions/ with "use server").
 */

export {
  createNPC
} from "./npc-actions/part-01";
export {
  getNPCsByContext,
  updateNPC,
  updateNPCAllowPcOnboarding
} from "./npc-actions/part-02";
export {
  getNPCsByFactionForOnboarding,
  getNPCsForAnalysis,
  getNPCsByWorld,
  getNPCById,
  getNPCNarrativeHooks,
  toggleNPCFavorite,
  updateNPCNotes,
  searchAllNPCs
} from "./npc-actions/part-03";
