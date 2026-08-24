/**
 * lore-actions — barrel re-export (see ./lore-actions/ with "use server").
 */

export type { StoryLegendSection } from "./lore-actions/part-01";
export {
  createLoreEntry,
  updateLoreEntry,
  updateLoreAllowPcOrigin,
  deleteLoreEntry,
  toggleLoreReveal,
  getLoreEntriesByWorld,
} from "./lore-actions/part-01";
export {
  getLoreById,
  getChildLocationsForOnboarding,
  getChildLoreEntries,
  getLoreEntriesForParentByWorld,
  getOrphanedLoreEntriesByWorld,
  getLoreEntriesForParent,
  getOrphanedLoreEntries,
} from "./lore-actions/part-02";
export {
  getLoreBreadcrumb,
  toggleLoreFavorite,
} from "./lore-actions/part-03";
