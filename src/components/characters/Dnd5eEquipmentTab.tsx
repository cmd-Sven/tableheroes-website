"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Scale,
  Sparkles,
  Swords,
  Shield,
  AlertTriangle,
  Save,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  deleteCharacterItem,
  getCharacterInventory,
} from "@/src/lib/actions/character-inventory-actions";
import type { CharacterItem, CharacterInventoryPayload } from "@/src/types/inventory";
import type { Dnd5eDerivedSheet, Dnd5eSheetData } from "@/src/lib/characters/dnd5e/types";
import {
  type Dnd5eEquipmentContainer,
  type Dnd5eEquipmentState,
  MAX_ATTUNEMENT,
  MAX_WEAPON_PRESETS,
} from "@/src/lib/characters/dnd5e/equipment-types";
import {
  applyEquipmentLoadout,
  applyWeaponPreset,
  carryingCapacityLb,
  computeArmorClassPreview,
  computeEquippedWeaponAttacks,
  computeEquipmentWeight,
  deleteEquipmentLoadout,
  deleteWeaponPreset,
  getUnassignedItems,
  hasBackpackContainer,
  normalizeEquipmentState,
  placeItemInGeneralSlot,
  placeItemInSlot,
  removeItemFromEquipment,
  saveEquipmentLoadout,
  saveWeaponPreset,
  toggleAttunement,
} from "@/src/lib/characters/dnd5e/equipment";
import {
  inferContainerKind,
  isBackpackItem,
  resolveCharacterItemStats,
} from "@/src/lib/characters/dnd5e/item-resolve";
import {
  consumeFromStack,
  duplicateCharacterItem,
  setItemInventoryCategory,
  splitStack,
} from "@/src/lib/characters/dnd5e/inventory-item-ops";
import { formatSigned } from "@/src/lib/characters/dnd5e/formulas";
import { EquipmentSilhouette } from "@/src/components/characters/EquipmentSilhouette";
import { CustomDnd5eItemEditorModal } from "@/src/components/characters/CustomDnd5eItemEditorModal";
import { InventoryGrid } from "@/src/components/characters/inventory/InventoryGrid";
import { BeltSlotsStrip } from "@/src/components/characters/inventory/BeltSlotsStrip";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  characterId: string;
  sheet: Dnd5eSheetData;
  derived: Dnd5eDerivedSheet;
  level: number;
  readOnly: boolean;
  onEquipmentChange: (equipment: Dnd5eEquipmentState) => void;
};

export function Dnd5eEquipmentTab({
  characterId,
  sheet,
  derived,
  level,
  readOnly,
  onEquipmentChange,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [inventory, setInventory] = useState<CharacterInventoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemEditor, setItemEditor] = useState<CharacterItem | null | "new">(null);

  const equipment = useMemo(
    () => normalizeEquipmentState(sheet.equipment),
    [sheet.equipment],
  );

  const reloadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCharacterInventory(characterId);
      setInventory(data);
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    void reloadInventory();
  }, [reloadInventory]);

  const items = useMemo(
    () => (inventory?.items ?? []).filter((i) => !i.is_deleted),
    [inventory?.items],
  );

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const itemNames = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i.name])),
    [items],
  );

  const strScore = sheet.abilities.str?.score ?? 10;
  const capacity = carryingCapacityLb(strScore);
  const totalWeight = computeEquipmentWeight(items, equipment);
  const overCapacity = totalWeight > capacity;
  const hasBackpack = hasBackpackContainer(equipment);
  const unassigned = getUnassignedItems(items, equipment);

  const selectableForSlots = useMemo(() => {
    const ids = new Set<string>();
    const list: CharacterItem[] = [];
    const equippedIds = new Set([
      ...Object.values(equipment.slots).filter(Boolean),
      ...Object.values(equipment.generalSlots ?? {}).filter(Boolean),
    ] as string[]);
    for (const item of [...unassigned, ...items.filter((i) => equippedIds.has(i.id))]) {
      if (ids.has(item.id)) continue;
      ids.add(item.id);
      list.push(item);
    }
    return list;
  }, [unassigned, items, equipment.slots, equipment.generalSlots]);

  const weaponAttacks = computeEquippedWeaponAttacks(sheet, derived, items, equipment, level);
  const acPreview = computeArmorClassPreview(sheet, derived, items, equipment);

  function update(next: Dnd5eEquipmentState) {
    onEquipmentChange(normalizeEquipmentState(next));
  }

  function addDefaultBackpack() {
    const container: Dnd5eEquipmentContainer = {
      id: crypto.randomUUID(),
      kind: "backpack",
      label: t("equipment.defaultBackpack"),
      linkedItemId: null,
      itemIds: [],
    };
    update({ ...equipment, containers: [...equipment.containers, container] });
  }

  function addBackpackFromItem(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const kind = inferContainerKind(item) ?? "backpack";
    const container: Dnd5eEquipmentContainer = {
      id: crypto.randomUUID(),
      kind,
      label: item.name,
      linkedItemId: itemId,
      itemIds: [],
    };
    let next = normalizeEquipmentState(equipment);
    next = removeItemFromEquipment(next, itemId);
    next.containers = [...next.containers, container];
    update(next);
  }

  function addCustomCategory(label: string) {
    const cat = { id: crypto.randomUUID(), label };
    update({
      ...equipment,
      customCategories: [...(equipment.customCategories ?? []), cat],
    });
  }

  async function handleDeleteItem(item: CharacterItem) {
    if (!confirm(t("equipment.deleteConfirm", { name: item.name }))) return;
    await deleteCharacterItem(item.id);
    update(removeItemFromEquipment(equipment, item.id));
    await reloadInventory();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-libre text-sm">{t("equipment.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zeile 1: Traglast (kompakt) + Inventar-Grid */}
      <div className="grid gap-4 lg:grid-cols-[minmax(140px,180px)_1fr]">
        <section
          className={`rounded-lg border bg-background-card p-3 ${
            overCapacity ? "border-red-500/70 bg-red-950/10" : "border-hero-dark"
          }`}
        >
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold flex items-center gap-1.5 mb-2">
              <Scale className="h-3.5 w-3.5" />
              {t("equipment.carryingCapacity")}
            </h3>
            {overCapacity ? (
              <span title={t("inventory.carryingOverCapacity", { weight: totalWeight, max: capacity })}>
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              </span>
            ) : null}
          </div>
          <p className={`font-barlow text-lg font-bold leading-tight ${overCapacity ? "text-red-300" : "text-white"}`}>
            {totalWeight}
            <span className="text-xs font-normal text-gray-500"> / {capacity} lb</span>
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-hero-dark overflow-hidden">
            <div
              className={`h-full transition-all ${
                overCapacity ? "bg-red-500" : "bg-hero-vibrant"
              }`}
              style={{ width: `${Math.min(100, (totalWeight / Math.max(1, capacity)) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 font-libre text-[9px] text-gray-600">
            {t("equipment.capacityFormula", { str: strScore, cap: capacity })}
          </p>
          {overCapacity ? (
            <p className="mt-1 font-libre text-[9px] text-red-400/90">
              {t("inventory.carryingOverCapacity", { weight: totalWeight, max: capacity })}
            </p>
          ) : null}

          <BeltSlotsStrip
            equipment={equipment}
            itemNames={itemNames}
            itemMap={itemMap}
            readOnly={readOnly}
            onEquipmentChange={update}
            compact
          />
        </section>

        <InventoryGrid
          items={items}
          equipment={equipment}
          readOnly={readOnly}
          onEquipmentChange={update}
          onAddItem={() => setItemEditor("new")}
          onEditItem={(item) => setItemEditor(item)}
          onDeleteItem={handleDeleteItem}
          onDuplicateItem={async (item) => {
            await duplicateCharacterItem(item);
            await reloadInventory();
          }}
          onSplitStack={async (item, amount) => {
            await splitStack(item, amount);
            await reloadInventory();
          }}
          onConsumeStack={async (item, amount) => {
            const result = await consumeFromStack(item, amount);
            if (!result) {
              update(removeItemFromEquipment(equipment, item.id));
            }
            await reloadInventory();
          }}
          onAssignCategory={async (item, category) => {
            await setItemInventoryCategory(item, category);
            await reloadInventory();
          }}
          onAddDefaultBackpack={addDefaultBackpack}
          onAddCustomCategory={addCustomCategory}
        />
      </div>

      {/* Rucksack aus Inventar hinzufügen (wenn noch keiner) */}
      {equipment.containers.length === 0 && !readOnly ? (
        <section className="rounded-lg border border-hero-dark bg-background-card p-4">
          <p className="font-libre text-sm text-gray-400 mb-3">{t("equipment.step1Hint")}</p>
          {items.filter((i) => isBackpackItem(i) || inferContainerKind(i) != null).length > 0 ? (
            <select
              value=""
              onChange={(e) => e.target.value && addBackpackFromItem(e.target.value)}
              className="w-full max-w-xs rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
            >
              <option value="">{t("equipment.chooseBackpack")}</option>
              {items
                .filter((i) => isBackpackItem(i) || inferContainerKind(i) != null)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
            </select>
          ) : null}
        </section>
      ) : null}

      {hasBackpack || equipment.containers.length > 0 ? (
        <>
          {/* Silhouette + Kampfwerte */}
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border border-hero-dark bg-background-card p-4">
              <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold border-b border-hero-dark pb-2 mb-4">
                {t("equipment.step3Title")}
              </h3>
              <EquipmentSilhouette
                slots={equipment.slots}
                generalSlots={equipment.generalSlots}
                itemNames={itemNames}
                selectableItems={selectableForSlots}
                itemMap={itemMap}
                readOnly={readOnly}
                onEquip={(slot, itemId) =>
                  update(placeItemInSlot(equipment, slot, itemId, items))
                }
                onEquipGeneral={(slot, itemId) =>
                  update(placeItemInGeneralSlot(equipment, slot, itemId))
                }
              />

              {/* Waffenkombinationen (max. 2) */}
              <div className="mt-4 rounded border border-hero-border/40 bg-hero-dark/20 p-3 space-y-2">
                <h4 className="font-barlow text-xs font-bold uppercase text-accent-gold flex items-center gap-1.5">
                  <Swords className="h-3.5 w-3.5" />
                  {t("equipment.weaponPresetsTitle", { max: MAX_WEAPON_PRESETS })}
                </h4>
                <p className="font-libre text-[10px] text-gray-500">{t("equipment.weaponPresetsHint")}</p>
                {!readOnly ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const name = prompt(t("equipment.weaponPresetNamePrompt"));
                        if (!name?.trim()) return;
                        update(saveWeaponPreset(equipment, null, name.trim()));
                      }}
                      disabled={(equipment.weaponPresets?.length ?? 0) >= MAX_WEAPON_PRESETS}
                      className="inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-dark/40 disabled:opacity-40"
                    >
                      <Save className="h-3 w-3" />
                      {t("equipment.saveWeaponPreset")}
                    </button>
                  </div>
                ) : null}
                {(equipment.weaponPresets ?? []).length === 0 ? (
                  <p className="font-libre text-xs text-gray-500 italic">{t("equipment.noWeaponPresets")}</p>
                ) : (
                  <div className="space-y-1.5">
                    {(equipment.weaponPresets ?? []).map((preset) => (
                      <div
                        key={preset.id}
                        className="flex items-center gap-2 rounded border border-hero-border/30 bg-background-card/50 px-2 py-1.5"
                      >
                        <span className="font-libre text-xs text-gray-300 flex-1 truncate">{preset.name}</span>
                        <span className="font-libre text-[10px] text-gray-500 truncate max-w-[40%]">
                          {[preset.mainHand, preset.offHand]
                            .filter(Boolean)
                            .map((id) => itemNames[id!] ?? "?")
                            .join(" + ") || "—"}
                        </span>
                        {!readOnly ? (
                          <>
                            <button
                              type="button"
                              title={t("equipment.applyWeaponPreset")}
                              onClick={() => update(applyWeaponPreset(equipment, preset.id, items))}
                              className="text-hero-vibrant hover:text-white"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={t("equipment.deleteWeaponPreset")}
                              onClick={() => {
                                if (!confirm(t("equipment.deleteWeaponPresetConfirm", { name: preset.name }))) return;
                                update(deleteWeaponPreset(equipment, preset.id));
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vollständige Ausrüstungen */}
              <div className="mt-4 rounded border border-hero-border/40 bg-hero-dark/20 p-3 space-y-2">
                <h4 className="font-barlow text-xs font-bold uppercase text-accent-gold flex items-center gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {t("equipment.loadoutsTitle")}
                </h4>
                <p className="font-libre text-[10px] text-yellow-600/90 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  {t("equipment.loadoutRestWarning")}
                </p>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(t("equipment.loadoutSaveConfirm"))) return;
                      const name = prompt(t("equipment.loadoutNamePrompt"));
                      if (!name?.trim()) return;
                      update(saveEquipmentLoadout(equipment, null, name.trim()));
                    }}
                    className="inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-dark/40"
                  >
                    <Save className="h-3 w-3" />
                    {t("equipment.saveLoadout")}
                  </button>
                ) : null}
                {(equipment.loadouts ?? []).length === 0 ? (
                  <p className="font-libre text-xs text-gray-500 italic">{t("equipment.noLoadouts")}</p>
                ) : (
                  <div className="space-y-1.5">
                    {(equipment.loadouts ?? []).map((loadout) => (
                      <div
                        key={loadout.id}
                        className="flex items-center gap-2 rounded border border-hero-border/30 bg-background-card/50 px-2 py-1.5"
                      >
                        <span className="font-libre text-xs text-gray-300 flex-1 truncate">{loadout.name}</span>
                        {!readOnly ? (
                          <>
                            <button
                              type="button"
                              title={t("equipment.applyLoadout")}
                              onClick={() => {
                                if (!confirm(t("equipment.loadoutApplyConfirm"))) return;
                                update(applyEquipmentLoadout(equipment, loadout.id, items));
                              }}
                              className="text-hero-vibrant hover:text-white"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={t("equipment.deleteLoadout")}
                              onClick={() => {
                                if (!confirm(t("equipment.deleteLoadoutConfirm", { name: loadout.name }))) return;
                                update(deleteEquipmentLoadout(equipment, loadout.id));
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
              <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
                <Swords className="h-4 w-4" />
                {t("equipment.combatValues")}
              </h3>

              <div className="rounded border border-hero-border/40 bg-hero-dark/20 p-3">
                <p className="font-barlow text-xs uppercase text-gray-500 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> {t("equipment.acPreview")}
                </p>
                <p className="font-barlow text-3xl font-bold text-white mt-1">{acPreview.ac}</p>
                <p className="font-libre text-xs text-gray-500 mt-1">{acPreview.breakdown}</p>
                <p className="font-libre text-[10px] text-gray-600 mt-1">
                  {t("equipment.storedAc")} {derived.ac}
                </p>
              </div>

              {weaponAttacks.length === 0 ? (
                <p className="font-libre text-sm text-gray-500">
                  {t("equipment.noWeapons")}
                </p>
              ) : (
                <div className="space-y-2">
                  {weaponAttacks.map((atk) => (
                    <div
                      key={atk.itemId}
                      className="rounded border border-hero-border/40 bg-hero-dark/20 p-3"
                    >
                      <p className="font-barlow font-bold text-white">{atk.name}</p>
                      <p className="font-libre text-sm text-accent-gold mt-1">
                        {t("equipment.attack")} {formatSigned(atk.attackBonus)} · {t("equipment.damage")} {atk.damage}
                      </p>
                      {atk.notes ? (
                        <p className="font-libre text-xs text-gray-500 mt-1">{atk.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Einstimmung */}
          <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
            <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t("equipment.attunementTitle", { max: MAX_ATTUNEMENT })}
            </h3>
            <p className="font-libre text-xs text-gray-500">
              {t("equipment.attunementCount", {
                count: equipment.attunedItemIds.length,
                max: MAX_ATTUNEMENT,
              })}
            </p>
            <div className="space-y-2">
              {items
                .filter((i) => {
                  const s = resolveCharacterItemStats(i);
                  return s.attunement || s.isMagical;
                })
                .map((item) => {
                  const attuned = equipment.attunedItemIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 rounded border border-hero-border/30 bg-hero-dark/20 px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={attuned}
                        disabled={
                          readOnly ||
                          (!attuned && equipment.attunedItemIds.length >= MAX_ATTUNEMENT)
                        }
                        onChange={() => update(toggleAttunement(equipment, item.id))}
                        className="rounded border-hero-border"
                      />
                      <span className="font-libre text-sm text-gray-300">{item.name}</span>
                      {resolveCharacterItemStats(item).attunement ? (
                        <span className="ml-auto font-barlow text-[10px] uppercase text-accent-gold">
                          {t("equipment.attunement")}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              {items.filter((i) => resolveCharacterItemStats(i).isMagical).length === 0 ? (
                <p className="font-libre text-sm text-gray-500 italic">
                  {t("equipment.noMagicItems")}
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-lg border border-hero-dark bg-background-card p-4">
          <p className="font-libre text-sm text-gray-500 text-center py-4">
            {t("equipment.needBackpackFirst")}
          </p>
        </section>
      )}

      {itemEditor !== null ? (
        <CustomDnd5eItemEditorModal
          characterId={characterId}
          item={itemEditor === "new" ? null : itemEditor}
          onClose={() => setItemEditor(null)}
          onSaved={async () => {
            setItemEditor(null);
            await reloadInventory();
          }}
        />
      ) : null}
    </div>
  );
}
