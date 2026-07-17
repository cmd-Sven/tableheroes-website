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
  deleteContainerAndRedistribute,
  findHeaviestItemInContainer,
  getContainerInventoryItems,
  getContainerMaxCapacityLb,
  getUnassignedItems,
  placeItemInContainer,
  removeItemFromEquipment,
} from "@/src/lib/characters/dnd5e/equipment";
import { getItemDisplayCategory, isMagicalItem, MAGICAL_FILTER_ID } from "@/src/lib/characters/dnd5e/inventory-categories";
import { DRAG_MIME } from "@/src/lib/characters/dnd5e/slot-validation";
import { getDragItemId, setDragItemId } from "@/src/lib/characters/dnd5e/drag-state";
import {
  groupItemsIntoStacks,
  INVENTORY_GRID_COLS,
  INVENTORY_SLOTS_PER_PAGE,
  INVENTORY_TILE_GAP_PX,
  INVENTORY_TILE_PX,
  inventoryGridContentWidthPx,
  paginateStacks,
  sortStacksForDisplay,
  type InventoryStack,
} from "@/src/lib/characters/dnd5e/inventory-stacking";
import type { PartyCharacterOption } from "@/src/lib/actions/character-inventory-actions";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import { BackpackTabs } from "./BackpackTabs";
import { CategoryAssignModal } from "./CategoryAssignModal";
import { ContainerManageModal } from "./ContainerManageModal";
import { ContainerSetupModal } from "./ContainerSetupModal";
import { InventoryCategoryBar } from "./InventoryCategoryBar";
import {
  InventoryItemContextMenu,
  type ContextMenuAction,
} from "./InventoryItemContextMenu";
import {
  ItemDeleteConfirmModal,
  ItemDuplicateConfirmModal,
  ItemGiveModal,
  ItemMoveModal,
} from "./ItemActionModals";
import { InventoryItemTile } from "./InventoryItemTile";
import { StackSplitModal } from "./StackSplitModal";

const UNASSIGNED_ID = "__unassigned__";

type Props = {
  items: CharacterItem[];
  equipment: Dnd5eEquipmentState;
  readOnly: boolean;
  highlightItemIds?: Set<string>;
  partyCharacters?: PartyCharacterOption[];
  onEquipmentChange: (equipment: Dnd5eEquipmentState) => void;
  onAddItem: () => void;
  onEditItem: (item: CharacterItem) => void;
  onDeleteItem: (item: CharacterItem) => Promise<void>;
  onDuplicateItem: (item: CharacterItem) => Promise<void>;
  onSplitStack: (item: CharacterItem, amount: number) => Promise<void>;
  onAssignCategory: (item: CharacterItem, category: string) => Promise<void>;
  onGiveItem?: (item: CharacterItem, targetCharacterId: string) => Promise<void>;
  onTransferContainer?: (
    containerId: string,
    targetCharacterId: string,
    equipment: Dnd5eEquipmentState,
  ) => Promise<void>;
  onAddContainer: (container: Dnd5eEquipmentContainer) => void;
  onUpdateContainer: (container: Dnd5eEquipmentContainer) => void;
  onAddCustomCategory: (label: string) => void;
  variant?: "sheet" | "session";
  /** Kontrollierter aktiver Behälter (für Ablegen aus Ausrüstungsslots) */
  activeContainerId?: string | null;
  onActiveContainerIdChange?: (id: string | null) => void;
};

type ItemModal =
  | { type: "delete"; item: CharacterItem }
  | { type: "duplicate"; item: CharacterItem }
  | { type: "split"; stack: InventoryStack }
  | { type: "move"; item: CharacterItem }
  | { type: "give"; item: CharacterItem };

export function InventoryGrid({
  items,
  equipment,
  readOnly,
  highlightItemIds,
  partyCharacters = [],
  onEquipmentChange,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onDuplicateItem,
  onSplitStack,
  onAssignCategory,
  onGiveItem,
  onTransferContainer,
  onAddContainer,
  onUpdateContainer,
  onAddCustomCategory,
  variant = "sheet",
  activeContainerId: controlledActiveId,
  onActiveContainerIdChange,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const isSession = variant === "session";
  const [internalActiveId, setInternalActiveId] = useState<string | null>(
    equipment.containers[0]?.id ?? null,
  );
  const activeContainerId =
    controlledActiveId !== undefined ? controlledActiveId : internalActiveId;

  function setActiveContainerId(id: string | null) {
    if (onActiveContainerIdChange) onActiveContainerIdChange(id);
    else setInternalActiveId(id);
  }
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    stack: InventoryStack;
    x: number;
    y: number;
  } | null>(null);
  const [itemModal, setItemModal] = useState<ItemModal | null>(null);
  const [assignModal, setAssignModal] = useState<CharacterItem | null>(null);
  const [assignUnknownMode, setAssignUnknownMode] = useState(false);
  const [containerSetup, setContainerSetup] = useState<
    | { mode: "create"; linkedItemId?: string | null; linkedItemName?: string }
    | { mode: "edit"; container: Dnd5eEquipmentContainer }
    | null
  >(null);
  const [manageContainerId, setManageContainerId] = useState<string | null>(null);

  const unassigned = useMemo(
    () => getUnassignedItems(items, equipment),
    [items, equipment],
  );

  const activeContainer = useMemo(() => {
    if (activeContainerId === UNASSIGNED_ID) return null;
    return (
      equipment.containers.find((c) => c.id === activeContainerId) ??
      equipment.containers[0] ??
      null
    );
  }, [activeContainerId, equipment.containers]);

  const displayItems = useMemo(() => {
    if (activeContainerId === UNASSIGNED_ID) return unassigned;
    if (!activeContainer) return unassigned;
    return getContainerInventoryItems(activeContainer, items, equipment);
  }, [activeContainerId, activeContainer, items, equipment, unassigned]);

  const filteredItems = useMemo(() => {
    if (!categoryFilter) return displayItems;
    if (categoryFilter === MAGICAL_FILTER_ID) {
      return displayItems.filter((item) => isMagicalItem(item));
    }
    return displayItems.filter(
      (item) =>
        getItemDisplayCategory(item, equipment.customCategories) === categoryFilter,
    );
  }, [displayItems, categoryFilter, equipment.customCategories]);

  const stacks = useMemo(
    () => sortStacksForDisplay(groupItemsIntoStacks(filteredItems), highlightItemIds),
    [filteredItems, highlightItemIds],
  );
  const { pageStacks, totalPages } = useMemo(
    () => paginateStacks(stacks, page),
    [stacks, page],
  );

  const emptySlots = Math.max(0, INVENTORY_SLOTS_PER_PAGE - pageStacks.length);
  const showAddSlot =
    !readOnly && page === totalPages - 1 && pageStacks.length < INVENTORY_SLOTS_PER_PAGE;

  const containerWeight = activeContainer ? containerWeightLb(activeContainer, items) : 0;
  const containerCap = activeContainer ? getContainerMaxCapacityLb(activeContainer) : 0;
  const atCapacity = activeContainer ? containerWeight >= containerCap : false;
  const heaviest = activeContainer ? findHeaviestItemInContainer(activeContainer, items) : null;

  const weightByContainer = useMemo(
    () =>
      equipment.containers.map((c) => ({
        id: c.id,
        weightLb: containerWeightLb(c, items),
        maxLb: getContainerMaxCapacityLb(c),
      })),
    [equipment.containers, items],
  );

  const manageContainer = manageContainerId
    ? equipment.containers.find((c) => c.id === manageContainerId)
    : null;

  function openContextMenu(stack: InventoryStack, e: React.MouseEvent) {
    if (readOnly) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      stack,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 4,
    });
  }

  function handleContextAction(action: ContextMenuAction) {
    if (!contextMenu) return;
    const stack = contextMenu.stack;
    const item = stack.representative;
    setContextMenu(null);

    switch (action) {
      case "edit":
        onEditItem(item);
        break;
      case "assignCategory":
        setAssignModal(item);
        break;
      case "delete":
        setItemModal({ type: "delete", item });
        break;
      case "duplicate":
        setItemModal({ type: "duplicate", item });
        break;
      case "split":
        setItemModal({ type: "split", stack });
        break;
      case "move":
        setItemModal({ type: "move", item });
        break;
      case "give":
        setItemModal({ type: "give", item });
        break;
    }
  }

  function handleMoveItem(item: CharacterItem, containerId: string) {
    let next = removeItemFromEquipment(equipment, item.id);
    next = placeItemInContainer(next, containerId, item.id, items);
    onEquipmentChange(next);
    setItemModal(null);
  }

  function handleInventoryDragOver(e: React.DragEvent) {
    if (readOnly) return;
    const itemId = getDragItemId();
    if (!itemId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleInventoryDrop(e: React.DragEvent) {
    if (readOnly) return;
    e.preventDefault();
    const itemId = e.dataTransfer.getData(DRAG_MIME) || getDragItemId();
    setDragItemId(null);
    if (!itemId) return;

    // Bereits im aktuellen Container → nichts tun
    if (activeContainer?.itemIds.includes(itemId)) return;

    if (activeContainerId === UNASSIGNED_ID || !activeContainer) {
      onEquipmentChange(removeItemFromEquipment(equipment, itemId));
      return;
    }

    onEquipmentChange(
      placeItemInContainer(equipment, activeContainer.id, itemId, items, { prepend: true }),
    );
  }

  return (
    <section
      className={
        isSession
          ? "w-fit max-w-full space-y-2"
          : "w-fit max-w-full rounded-lg border border-hero-dark bg-background-card p-3 space-y-2"
      }
    >
      {!isSession ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">
            {t("equipment.inventory")}
          </h3>
          {activeContainer ? (
            <div className="flex flex-col items-end gap-0.5 font-libre text-[9px] text-gray-500">
              <div className="flex items-center gap-1.5">
                <Scale className="h-3 w-3" />
                <span className={containerWeight > containerCap ? "text-red-400" : "text-gray-400"}>
                  {t("equipment.containerWeight", { weight: containerWeight })}
                  {" / "}
                  {t("equipment.containerMaxCapacity", { cap: containerCap })}
                </span>
              </div>
              {heaviest ? (
                <span className="text-gray-600">
                  {t("inventory.heaviestItem", {
                    name: heaviest.item.name,
                    weight: heaviest.weightLb,
                  })}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : activeContainer ? (
        <div className="flex flex-col items-end gap-0.5 font-libre text-[8px] text-slate-300">
          <div className="flex items-center gap-1">
            <Scale className="h-3 w-3 text-accent-gold/80" />
            <span className={containerWeight > containerCap ? "text-red-300" : ""}>
              {containerWeight}/{containerCap} lb
            </span>
          </div>
          {heaviest ? (
            <span className="text-slate-500">
              {t("inventory.heaviestShort", { name: heaviest.item.name, weight: heaviest.weightLb })}
            </span>
          ) : null}
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
        onAdd={readOnly ? undefined : () => setContainerSetup({ mode: "create" })}
        onManage={readOnly ? undefined : (id) => setManageContainerId(id)}
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

      <div className="max-w-full" style={{ width: inventoryGridContentWidthPx() }}>
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
      </div>

      <div
        className={
          isSession
            ? "w-fit rounded-lg border border-black/30 bg-black/20 p-1"
            : "w-fit rounded-lg border border-hero-border/60 bg-hero-dark/20 p-1.5"
        }
        onDragOver={handleInventoryDragOver}
        onDrop={handleInventoryDrop}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${INVENTORY_GRID_COLS}, ${INVENTORY_TILE_PX}px)`,
            gap: `${INVENTORY_TILE_GAP_PX}px`,
            width: inventoryGridContentWidthPx(),
          }}
        >
          {pageStacks.map((stack) => (
            <InventoryItemTile
              key={stack.stackKey}
              item={stack.representative}
              quantity={stack.quantity}
              customCategories={equipment.customCategories}
              readOnly={readOnly}
              isHighlighted={highlightItemIds?.has(stack.representative.id)}
              onClick={(e) => openContextMenu(stack, e)}
              onContextMenu={(e) => openContextMenu(stack, e)}
            />
          ))}

          {showAddSlot ? (
            <div className="flex h-11 w-11 items-center justify-center">
              <button
                type="button"
                onClick={onAddItem}
                disabled={atCapacity && activeContainerId !== UNASSIGNED_ID}
                title={
                  atCapacity && activeContainerId !== UNASSIGNED_ID
                    ? t("inventory.capacityFull")
                    : t("equipment.customItem")
                }
                className="flex h-10 w-10 flex-col items-center justify-center rounded border border-dashed border-hero-border/40 text-gray-500 transition-colors hover:border-hero-vibrant hover:text-hero-vibrant disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {Array.from({ length: Math.max(0, emptySlots - (showAddSlot ? 1 : 0)) }).map((_, i) => (
            <div key={`empty-${i}`} className="h-11 w-11 rounded border border-hero-border/10 bg-hero-dark/5" />
          ))}
        </div>

        {stacks.length === 0 && !showAddSlot ? (
          <p className="py-4 text-center font-libre text-xs text-gray-500 italic">
            {t("equipment.inventoryEmpty")}
          </p>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded p-0.5 text-gray-500 hover:text-hero-vibrant disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-barlow text-[10px] text-gray-500">
            {t("inventory.page", { current: page + 1, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded p-0.5 text-gray-500 hover:text-hero-vibrant disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {contextMenu ? (
        <InventoryItemContextMenu
          stack={contextMenu.stack}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          readOnly={readOnly}
          canGive={partyCharacters.length > 0 && Boolean(onGiveItem)}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      ) : null}

      {itemModal?.type === "delete" ? (
        <ItemDeleteConfirmModal
          item={itemModal.item}
          onClose={() => setItemModal(null)}
          onConfirm={() => {
            void onDeleteItem(itemModal.item).then(() => setItemModal(null));
          }}
        />
      ) : null}

      {itemModal?.type === "duplicate" ? (
        <ItemDuplicateConfirmModal
          item={itemModal.item}
          onClose={() => setItemModal(null)}
          onConfirm={() => {
            void onDuplicateItem(itemModal.item).then(() => setItemModal(null));
          }}
        />
      ) : null}

      {itemModal?.type === "split" ? (
        <StackSplitModal
          title={t("inventory.splitTitle", { name: itemModal.stack.representative.name })}
          maxAmount={itemModal.stack.quantity - 1}
          confirmLabel={t("inventory.split")}
          onConfirm={(amount) => {
            void onSplitStack(itemModal.stack.representative, amount).then(() =>
              setItemModal(null),
            );
          }}
          onClose={() => setItemModal(null)}
        />
      ) : null}

      {itemModal?.type === "move" ? (
        <ItemMoveModal
          item={itemModal.item}
          containers={equipment.containers}
          activeContainerId={activeContainer?.id ?? UNASSIGNED_ID}
          onClose={() => setItemModal(null)}
          onConfirm={(containerId) => handleMoveItem(itemModal.item, containerId)}
        />
      ) : null}

      {itemModal?.type === "give" && onGiveItem ? (
        <ItemGiveModal
          item={itemModal.item}
          partyCharacters={partyCharacters}
          onClose={() => setItemModal(null)}
          onConfirm={(targetId) => {
            void onGiveItem(itemModal.item, targetId).then(() => setItemModal(null));
          }}
        />
      ) : null}

      {containerSetup ? (
        <ContainerSetupModal
          mode={containerSetup.mode}
          initial={containerSetup.mode === "edit" ? containerSetup.container : null}
          linkedItemName={
            containerSetup.mode === "create" ? containerSetup.linkedItemName : undefined
          }
          onClose={() => setContainerSetup(null)}
          onConfirm={(container) => {
            if (containerSetup.mode === "create") {
              onAddContainer({
                ...container,
                linkedItemId: containerSetup.linkedItemId ?? container.linkedItemId ?? null,
                itemIds: container.itemIds ?? [],
              });
            } else {
              onUpdateContainer({ ...containerSetup.container, ...container });
            }
            setContainerSetup(null);
          }}
        />
      ) : null}

      {manageContainer ? (
        <ContainerManageModal
          container={manageContainer}
          itemCount={manageContainer.itemIds.length}
          partyCharacters={partyCharacters}
          onClose={() => setManageContainerId(null)}
          onEdit={() => {
            setManageContainerId(null);
            setContainerSetup({ mode: "edit", container: manageContainer });
          }}
          onDelete={() => {
            const next = deleteContainerAndRedistribute(equipment, manageContainer.id, items);
            onEquipmentChange(next);
            if (activeContainerId === manageContainer.id) {
              setActiveContainerId(next.containers[0]?.id ?? null);
            }
            setManageContainerId(null);
          }}
          onTransfer={(targetId) => {
            if (!onTransferContainer) return;
            void onTransferContainer(manageContainer.id, targetId, equipment).then(() => {
              const next = normalizeEquipmentRemoveContainer(equipment, manageContainer.id);
              onEquipmentChange(next);
              if (activeContainerId === manageContainer.id) {
                setActiveContainerId(next.containers[0]?.id ?? null);
              }
              setManageContainerId(null);
            });
          }}
        />
      ) : null}

      {(assignModal || assignUnknownMode) ? (
        <CategoryAssignModal
          item={
            assignModal ??
            (assignUnknownMode
              ? filteredItems.find((i) => getItemDisplayCategory(i) === "unknown") ??
                items.find((i) => getItemDisplayCategory(i) === "unknown") ??
                null
              : null)
          }
          customCategories={equipment.customCategories ?? []}
          onAssign={async (cat) => {
            const target =
              assignModal ?? items.find((i) => getItemDisplayCategory(i) === "unknown");
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

function normalizeEquipmentRemoveContainer(
  equipment: Dnd5eEquipmentState,
  containerId: string,
): Dnd5eEquipmentState {
  return {
    ...equipment,
    containers: equipment.containers.filter((c) => c.id !== containerId),
  };
}

export type { Dnd5eEquipmentContainer };
