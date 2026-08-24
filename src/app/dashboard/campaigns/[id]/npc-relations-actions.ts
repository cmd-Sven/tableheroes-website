/**
 * npc-relations-actions — barrel re-export (see ./npc-relations-actions/ with "use server").
 */

export {
  createNPCRelationFromHook,
  getNPCRelations,
  findNPCByName
} from "./npc-relations-actions/part-01";
export {
  createNPCRelationManually,
  createNPCRelation,
  deleteNPCRelation,
  checkNPCRelationExists
} from "./npc-relations-actions/part-02";
export {
  checkNPCHookRelationExists,
  suggestInferenceRelations,
  suggestInferenceRelationsForTarget
} from "./npc-relations-actions/part-03";
export {
  promoteHookToNPC,
  updateHookRelationsToNPC
} from "./npc-relations-actions/part-04";
