/**
 * loot-actions — barrel re-export (see ./loot-actions/ with "use server").
 */

export type { LootDraftPayload, LootIdentifyRequestRow, LootItemRow } from "./loot-actions/part-01";
export {
  publishLootToSession,
  takeAllLootGoldFromContainer,
  claimLootItemFromContainer,
  requestLootItemIdentify,
} from "./loot-actions/part-01";
export type { CampaignShopLootPickRow } from "./loot-actions/part-02";
export {
  resolveLootItemIdentify,
  gmRemoveLootItemFromStage,
  openLootChestOnStage,
  gmClearLootGoldFromStage,
  listCampaignShopItemsForLootDraft,
} from "./loot-actions/part-02";
