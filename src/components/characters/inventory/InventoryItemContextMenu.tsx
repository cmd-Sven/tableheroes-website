"use client";

import {
  ArrowLeftRight,
  Backpack,
  Copy,
  Gift,
  Pencil,
  Pocket,
  Scissors,
  Tags,
  Trash2,
} from "lucide-react";
import type { InventoryStack } from "@/src/lib/characters/dnd5e/inventory-stacking";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import {
  ItemActionContextMenu,
  type ItemActionMenuAnchor,
  type ItemActionMenuEntry,
} from "./ItemActionContextMenu";

export type ContextMenuAction =
  | "edit"
  | "delete"
  | "duplicate"
  | "split"
  | "move"
  | "give"
  | "assignCategory"
  | "equipAsContainer"
  | "placeOnBelt";

type Props = {
  stack: InventoryStack;
  anchor: ItemActionMenuAnchor;
  readOnly: boolean;
  canGive: boolean;
  canEquipAsContainer?: boolean;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
};

export function InventoryItemContextMenu({
  stack,
  anchor,
  readOnly,
  canGive,
  canEquipAsContainer = false,
  onAction,
  onClose,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const canSplit = stack.quantity > 1;

  if (readOnly) return null;

  const items: Array<ItemActionMenuEntry & { action: ContextMenuAction; hidden?: boolean }> = [
    { action: "edit", id: "edit", label: t("equipment.edit"), icon: Pencil, onSelect: () => onAction("edit") },
    {
      action: "assignCategory",
      id: "assignCategory",
      label: t("inventory.assignCategory"),
      icon: Tags,
      onSelect: () => onAction("assignCategory"),
    },
    {
      action: "placeOnBelt",
      id: "placeOnBelt",
      label: t("inventory.placeOnBelt"),
      icon: Pocket,
      onSelect: () => onAction("placeOnBelt"),
    },
    {
      action: "equipAsContainer",
      id: "equipAsContainer",
      label: t("inventory.equipAsContainer"),
      icon: Backpack,
      hidden: !canEquipAsContainer,
      onSelect: () => onAction("equipAsContainer"),
    },
    {
      action: "delete",
      id: "delete",
      label: t("equipment.delete"),
      icon: Trash2,
      danger: true,
      onSelect: () => onAction("delete"),
    },
    {
      action: "duplicate",
      id: "duplicate",
      label: t("inventory.duplicate"),
      icon: Copy,
      onSelect: () => onAction("duplicate"),
    },
    {
      action: "split",
      id: "split",
      label: t("inventory.split"),
      icon: Scissors,
      hidden: !canSplit,
      onSelect: () => onAction("split"),
    },
    {
      action: "move",
      id: "move",
      label: t("inventory.move"),
      icon: ArrowLeftRight,
      onSelect: () => onAction("move"),
    },
    {
      action: "give",
      id: "give",
      label: t("inventory.give"),
      icon: Gift,
      hidden: !canGive,
      onSelect: () => onAction("give"),
    },
  ];

  const title = `${stack.representative.name}${stack.quantity > 1 ? ` ×${stack.quantity}` : ""}`;

  return (
    <ItemActionContextMenu
      title={title}
      anchor={anchor}
      items={items.filter((item) => !item.hidden)}
      onClose={onClose}
    />
  );
}
