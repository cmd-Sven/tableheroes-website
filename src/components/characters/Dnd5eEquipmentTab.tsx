"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Scale,
  Sparkles,
  Swords,
  Shield,
  AlertTriangle,
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
  MAX_BELT_SLOTS,
} from "@/src/lib/characters/dnd5e/equipment-types";
import {
  carryingCapacityLb,
  computeArmorClassPreview,
  computeEquippedWeaponAttacks,
  computeEquipmentWeight,
  getUnassignedItems,
  hasBackpackContainer,
  normalizeEquipmentState,
  placeItemInSlot,
  placeItemOnBelt,
  removeItemFromEquipment,
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
import {
  DRAG_MIME,
  validateItemForBelt,
} from "@/src/lib/characters/dnd5e/slot-validation";
import { getDragItemId, setDragItemId } from "@/src/lib/characters/dnd5e/drag-state";
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
  const [invalidBeltSlot, setInvalidBeltSlot] = useState<number | null>(null);

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
  const hasBackpack = hasBackpackContainer(equipment);
  const unassigned = getUnassignedItems(items, equipment);

  const selectableForSlots = useMemo(() => {
    const ids = new Set<string>();
    const list: CharacterItem[] = [];
    for (const item of [...unassigned, ...items.filter((i) => Object.values(equipment.slots).includes(i.id))]) {
      if (ids.has(item.id)) continue;
      ids.add(item.id);
      list.push(item);
    }
    return list;
  }, [unassigned, items, equipment.slots]);

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

  function handleBeltDragOver(e: React.DragEvent, index: number) {
    if (readOnly) return;
    e.preventDefault();
    const itemId = getDragItemId();
    if (!itemId) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    const validation = validateItemForBelt(item);
    setInvalidBeltSlot(validation.valid ? null : index);
    e.dataTransfer.dropEffect = validation.valid ? "move" : "none";
  }

  function handleBeltDrop(e: React.DragEvent, index: number) {
    if (readOnly) return;
    e.preventDefault();
    const itemId = e.dataTransfer.getData(DRAG_MIME) || getDragItemId();
    setInvalidBeltSlot(null);
    setDragItemId(null);
    if (!itemId) return;
    const item = itemMap.get(itemId);
    if (!item) return;
    update(placeItemOnBelt(equipment, index, itemId));
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
        <section className="rounded-lg border border-hero-dark bg-background-card p-3">
          <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold flex items-center gap-1.5 mb-2">
            <Scale className="h-3.5 w-3.5" />
            {t("equipment.carryingCapacity")}
          </h3>
          <p className="font-barlow text-lg font-bold text-white leading-tight">
            {totalWeight}
            <span className="text-xs font-normal text-gray-500"> / {capacity} lb</span>
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-hero-dark overflow-hidden">
            <div
              className={`h-full transition-all ${
                totalWeight > capacity ? "bg-red-500" : "bg-hero-vibrant"
              }`}
              style={{ width: `${Math.min(100, (totalWeight / Math.max(1, capacity)) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 font-libre text-[9px] text-gray-600">
            {t("equipment.capacityFormula", { str: strScore, cap: capacity })}
          </p>
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
                itemNames={itemNames}
                selectableItems={selectableForSlots}
                itemMap={itemMap}
                readOnly={readOnly}
                onEquip={(slot, itemId) =>
                  update(placeItemInSlot(equipment, slot, itemId))
                }
              />
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

          {/* Gürtel mit DnD */}
          <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">
                {t("equipment.beltQuickAccess", { max: MAX_BELT_SLOTS })}
              </h3>
              <span className="rounded border border-hero-vibrant/40 bg-hero-vibrant/10 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
                {t("equipment.beltPrepared")}
              </span>
            </div>
            <p className="font-libre text-xs text-gray-500">
              {t("equipment.beltPreparedHint")}
            </p>
            <div className="grid gap-3 grid-cols-3 sm:grid-cols-6">
              {equipment.belt.map((itemId, index) => (
                <div
                  key={index}
                  className="space-y-1"
                  onDragOver={(e) => handleBeltDragOver(e, index)}
                  onDragLeave={() => setInvalidBeltSlot(null)}
                  onDrop={(e) => handleBeltDrop(e, index)}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-barlow text-[10px] uppercase text-gray-600">
                      {t("equipment.beltSlot", { n: index + 1 })}
                    </span>
                    {invalidBeltSlot === index ? (
                      <span title={t("inventory.equipConflict")}>
                        <AlertTriangle className="h-3 w-3 text-yellow-400" />
                      </span>
                    ) : itemId ? (
                      <span className="font-barlow text-[9px] font-bold uppercase text-hero-vibrant">
                        {t("equipment.beltPrepared")}
                      </span>
                    ) : null}
                  </div>
                  {readOnly ? (
                    <p className="font-libre text-sm text-gray-300 truncate">
                      {itemId ? itemNames[itemId] ?? "—" : "—"}
                    </p>
                  ) : (
                    <div
                      className={`min-h-[32px] rounded border px-2 py-1 font-libre text-[10px] text-white ${
                        itemId
                          ? "border-hero-vibrant/50 bg-hero-vibrant/10"
                          : "border-dashed border-hero-border/40 bg-hero-dark/20 text-gray-500"
                      }`}
                    >
                      {itemId ? (
                        <button
                          type="button"
                          onClick={() => update(placeItemOnBelt(equipment, index, null))}
                          className="truncate w-full text-left hover:text-red-400"
                          title={itemNames[itemId]}
                        >
                          {itemNames[itemId]}
                        </button>
                      ) : (
                        <span>{t("equipment.empty")}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

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
