"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Scale } from "lucide-react";
import type { CharacterItem } from "@/src/types/inventory";
import type {
  Dnd5eEquipmentContainer,
  Dnd5eEquipmentState,
} from "@/src/lib/characters/dnd5e/equipment-types";
import {
  containerWeightLb,
  getContainerInventoryItems,
  getContainerMaxCapacityLb,
  getUnassignedItems,
  placeItemInContainer,
  removeItemFromEquipment,
} from "@/src/lib/characters/dnd5e/equipment";
import { getItemDisplayCategory } from "@/src/lib/characters/dnd5e/inventory-categories";
import {
  groupItemsIntoStacks,
  INVENTORY_GRID_COLS,
  INVENTORY_SLOTS_PER_PAGE,
  paginateStacks,
  type InventoryStack,
} from "@/src/lib/characters/dnd5e/inventory-stacking";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import { BackpackTabs } from "./BackpackTabs";
import { CategoryAssignModal } from "./CategoryAssignModal";
import { InventoryCategoryBar } from "./InventoryCategoryBar";
import {
  InventoryItemContextMenu,
  type ContextMenuAction,
} from "./InventoryItemContextMenu";
import { InventoryItemTile } from "./InventoryItemTile";
import { StackSplitModal } from "./StackSplitModal";

const UNASSIGNED_ID = "__unassigned__";

type Props = {
  items: CharacterItem[];
  equipment: Dnd5eEquipmentState;
  readOnly: boolean;
  onEquipmentChange: (equipment: Dnd5eEquipmentState) => void;
  onAddItem: () => void;
  onEditItem: (item: CharacterItem) => void;
  onDeleteItem: (item: CharacterItem) => void;
  onDuplicateItem: (item: CharacterItem) => void;
  onSplitStack: (item: CharacterItem, amount: number) => Promise<void>;
  onConsumeStack: (item: CharacterItem, amount: number) => Promise<void>;
  onAssignCategory: (item: CharacterItem, category: string) => Promise<void>;
  onAddDefaultBackpack: () => void;
  onAddCustomCategory: (label: string) => void;
  /** Kompakte Darstellung für Live-Session-Rucksack */
  variant?: "sheet" | "session";
};

export function InventoryGrid({
  items,
  equipment,
  readOnly,
  onEquipmentChange,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onDuplicateItem,
  onSplitStack,
  onConsumeStack,
  onAssignCategory,
  onAddDefaultBackpack,
  onAddCustomCategory,
  variant = "sheet",
}: Props) {
  const { t } = useCharacterSheetLocale();
  const isSession = variant === "session";
  const [activeContainerId, setActiveContainerId] = useState<string | null>(
    equipment.containers[0]?.id ?? null,
  );
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    stack: InventoryStack;
    x: number;
    y: number;
  } | null>(null);
  const [splitModal, setSplitModal] = useState<{
    stack: InventoryStack;
    mode: "split" | "consume";
  } | null>(null);
  const [assignModal, setAssignModal] = useState<CharacterItem | null>(null);
  const [assignUnknownMode, setAssignUnknownMode] = useState(false);

  const unassigned = useMemo(
    () => getUnassignedItems(items, equipment),
    [items, equipment],
  );

  const activeContainer = useMemo(() => {
    if (activeContainerId === UNASSIGNED_ID) return null;
    return equipment.containers.find((c) => c.id === activeContainerId) ?? equipment.containers[0] ?? null;
  }, [activeContainerId, equipment.containers]);

  const displayItems = useMemo(() => {
    if (activeContainerId === UNASSIGNED_ID) return unassigned;
    if (!activeContainer) return unassigned;
    return getContainerInventoryItems(activeContainer, items, equipment);
  }, [activeContainerId, activeContainer, items, equipment, unassigned]);

  const filteredItems = useMemo(() => {
    if (!categoryFilter) return displayItems;
    return displayItems.filter(
      (item) =>
        getItemDisplayCategory(item, equipment.customCategories) === categoryFilter,
    );
  }, [displayItems, categoryFilter, equipment.customCategories]);

  const stacks = useMemo(() => groupItemsIntoStacks(filteredItems), [filteredItems]);
  const { pageStacks, totalPages } = useMemo(
    () => paginateStacks(stacks, page),
    [stacks, page],
  );

  const emptySlots = Math.max(0, INVENTORY_SLOTS_PER_PAGE - pageStacks.length);
  const showAddSlot = !readOnly && page === totalPages - 1 && pageStacks.length < INVENTORY_SLOTS_PER_PAGE;

  const containerWeight = activeContainer ? containerWeightLb(activeContainer, items) : 0;
  const containerCap = activeContainer ? getContainerMaxCapacityLb(activeContainer.kind) : 0;
  const atCapacity = activeContainer ? containerWeight >= containerCap : false;

  const weightByContainer = useMemo(
    () =>
      equipment.containers.map((c) => ({
        id: c.id,
        weightLb: containerWeightLb(c, items),
        maxLb: getContainerMaxCapacityLb(c.kind),
      })),
    [equipment.containers, items],
  );

  function handleContextAction(action: ContextMenuAction, containerId?: string) {
    if (!contextMenu) return;
    const stack = contextMenu.stack;
    const item = stack.representative;
    setContextMenu(null);

    switch (action) {
      case "repack":
        if (containerId) {
          let next = removeItemFromEquipment(equipment, item.id);
          next = placeItemInContainer(next, containerId, item.id, items);
          onEquipmentChange(next);
        }
        break;
      case "delete":
        void onDeleteItem(item);
        break;
      case "duplicate":
        void onDuplicateItem(item);
        break;
      case "split":
        setSplitModal({ stack, mode: "split" });
        break;
      case "consume":
        setSplitModal({ stack, mode: "consume" });
        break;
      case "edit":
        onEditItem(item);
        break;
    }
  }

  return (
    <section
      className={
        isSession
          ? "space-y-2"
          : "rounded-lg border border-hero-dark bg-background-card p-4 space-y-3"
      }
    >
      {!isSession ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">
            {t("equipment.inventory")}
          </h3>
          {activeContainer ? (
            <div className="flex items-center gap-2 font-libre text-[10px] text-gray-500">
              <Scale className="h-3 w-3" />
              <span className={containerWeight > containerCap ? "text-red-400" : "text-gray-400"}>
                {t("equipment.containerWeight", { weight: containerWeight })}
                {" / "}
                {t("equipment.containerMaxCapacity", { cap: containerCap })}
              </span>
            </div>
          ) : null}
        </div>
      ) : activeContainer ? (
        <div className="flex items-center justify-end gap-1 font-libre text-[9px] text-slate-300">
          <Scale className="h-3 w-3 text-accent-gold/80" />
          <span className={containerWeight > containerCap ? "text-red-300" : ""}>
            {containerWeight}/{containerCap} lb
          </span>
        </div>
      ) : null}

      <BackpackTabs
        containers={equipment.containers}
        activeId={activeContainer?.id ?? (activeContainerId === UNASSIGNED_ID ? UNASSIGNED_ID : null)}
        readOnly={readOnly}
        weightByContainer={weightByContainer}
        onSelect={(id) => {
          setActiveContainerId(id);
          setPage(0);
        }}
        onAddDefault={onAddDefaultBackpack}
      />

      {unassigned.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            setActiveContainerId(UNASSIGNED_ID);
            setPage(0);
          }}
          className={`font-barlow text-[10px] font-bold uppercase ${
            activeContainerId === UNASSIGNED_ID
              ? "text-hero-vibrant"
              : "text-amber-500 hover:text-amber-400"
          }`}
        >
          {t("equipment.unassigned", { count: unassigned.length })}
        </button>
      ) : null}

      <InventoryCategoryBar
        activeCategory={categoryFilter}
        customCategories={equipment.customCategories ?? []}
        readOnly={readOnly}
        onSelect={(cat) => {
          setCategoryFilter(cat);
          setPage(0);
        }}
        onAddCustomCategory={onAddCustomCategory}
        onAssignUnknown={() => setAssignUnknownMode(true)}
      />

      {/* RPG Grid */}
      <div
        className={
          isSession
            ? "rounded-lg border border-black/30 bg-black/20 p-1.5"
            : "rounded-lg border-2 border-hero-border/60 bg-hero-dark/20 p-2"
        }
      >
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${INVENTORY_GRID_COLS}, minmax(0, 1fr))` }}
        >
          {pageStacks.map((stack) => (
            <InventoryItemTile
              key={stack.stackKey}
              item={stack.representative}
              quantity={stack.quantity}
              customCategories={equipment.customCategories}
              readOnly={readOnly}
              onClick={() => {
                if (!readOnly) onEditItem(stack.representative);
              }}
              onContextMenu={(e) =>
                setContextMenu({ stack, x: e.clientX, y: e.clientY })
              }
            />
          ))}

          {showAddSlot ? (
            <button
              type="button"
              onClick={onAddItem}
              disabled={atCapacity && activeContainerId !== UNASSIGNED_ID}
              title={
                atCapacity && activeContainerId !== UNASSIGNED_ID
                  ? t("inventory.capacityFull")
                  : t("equipment.customItem")
              }
              className="flex aspect-square w-full flex-col items-center justify-center rounded border border-dashed border-hero-border/40 text-gray-500 transition-colors hover:border-hero-vibrant hover:text-hero-vibrant disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : null}

          {Array.from({ length: Math.max(0, emptySlots - (showAddSlot ? 1 : 0)) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-square w-full rounded-md border border-hero-border/15 bg-hero-dark/10"
            />
          ))}
        </div>

        {stacks.length === 0 && !showAddSlot ? (
          <p className="py-6 text-center font-libre text-sm text-gray-500 italic">
            {t("equipment.inventoryEmpty")}
          </p>
        ) : null}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded p-1 text-gray-500 hover:text-hero-vibrant disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-barlow text-xs text-gray-500">
            {t("inventory.page", { current: page + 1, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded p-1 text-gray-500 hover:text-hero-vibrant disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {contextMenu ? (
        <InventoryItemContextMenu
          stack={contextMenu.stack}
          containers={equipment.containers}
          activeContainerId={activeContainer?.id ?? UNASSIGNED_ID}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          readOnly={readOnly}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      ) : null}

      {splitModal ? (
        <StackSplitModal
          title={
            splitModal.mode === "split"
              ? t("inventory.splitTitle", { name: splitModal.stack.representative.name })
              : t("inventory.consumeTitle", { name: splitModal.stack.representative.name })
          }
          maxAmount={
            splitModal.mode === "split"
              ? splitModal.stack.quantity - 1
              : splitModal.stack.quantity
          }
          confirmLabel={
            splitModal.mode === "split" ? t("inventory.split") : t("inventory.consume")
          }
          onConfirm={(amount) => {
            const item = splitModal.stack.representative;
            if (splitModal.mode === "split") {
              void onSplitStack(item, amount);
            } else {
              void onConsumeStack(item, amount);
            }
            setSplitModal(null);
          }}
          onClose={() => setSplitModal(null)}
        />
      ) : null}

      {(assignModal || assignUnknownMode) ? (
        <CategoryAssignModal
          item={assignModal ?? (assignUnknownMode ? filteredItems.find((i) => getItemDisplayCategory(i) === "unknown") ?? items.find((i) => getItemDisplayCategory(i) === "unknown") ?? null : null)}
          customCategories={equipment.customCategories ?? []}
          onAssign={async (cat) => {
            const target = assignModal ?? items.find((i) => getItemDisplayCategory(i) === "unknown");
            if (target) await onAssignCategory(target, cat);
            setAssignModal(null);
            setAssignUnknownMode(false);
          }}
          onClose={() => {
            setAssignModal(null);
            setAssignUnknownMode(false);
          }}
        />
      ) : null}
    </section>
  );
}

export type { Dnd5eEquipmentContainer };
