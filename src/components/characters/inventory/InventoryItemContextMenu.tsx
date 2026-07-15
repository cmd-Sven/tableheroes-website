"use client";

import { useEffect, useRef } from "react";
import {
  Copy,
  Package,
  Pencil,
  Scissors,
  Trash2,
  Utensils,
} from "lucide-react";
import type { Dnd5eEquipmentContainer } from "@/src/lib/characters/dnd5e/equipment-types";
import type { InventoryStack } from "@/src/lib/characters/dnd5e/inventory-stacking";
import { isConsumableItem } from "@/src/lib/characters/dnd5e/inventory-categories";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

export type ContextMenuAction =
  | "repack"
  | "delete"
  | "duplicate"
  | "split"
  | "consume"
  | "edit";

type Props = {
  stack: InventoryStack;
  containers: Dnd5eEquipmentContainer[];
  activeContainerId: string;
  position: { x: number; y: number };
  readOnly: boolean;
  onAction: (action: ContextMenuAction, containerId?: string) => void;
  onClose: () => void;
};

export function InventoryItemContextMenu({
  stack,
  containers,
  activeContainerId,
  position,
  readOnly,
  onAction,
  onClose,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const ref = useRef<HTMLDivElement>(null);
  const canSplit = stack.quantity > 1;
  const canConsume = isConsumableItem(stack.representative);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  if (readOnly) return null;

  const otherContainers = containers.filter((c) => c.id !== activeContainerId);

  return (
    <div
      ref={ref}
      className="fixed z-90 min-w-[180px] rounded-lg border border-hero-border bg-background-card py-1 shadow-2xl"
      style={{ left: position.x, top: position.y }}
    >
      <p className="border-b border-hero-border/40 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold truncate">
        {stack.representative.name}
      </p>

      {otherContainers.length > 0 ? (
        <div className="border-b border-hero-border/30 py-1">
          <p className="px-3 py-0.5 font-barlow text-[9px] uppercase text-gray-600">
            {t("inventory.repackTo")}
          </p>
          {otherContainers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onAction("repack", c.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 font-libre text-xs text-gray-300 hover:bg-hero-dark/60 hover:text-white"
            >
              <Package className="h-3.5 w-3.5 text-hero-vibrant" />
              {c.label}
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onAction("edit")}
        className="flex w-full items-center gap-2 px-3 py-1.5 font-libre text-xs text-gray-300 hover:bg-hero-dark/60 hover:text-white"
      >
        <Pencil className="h-3.5 w-3.5" />
        {t("equipment.edit")}
      </button>

      <button
        type="button"
        onClick={() => onAction("duplicate")}
        className="flex w-full items-center gap-2 px-3 py-1.5 font-libre text-xs text-gray-300 hover:bg-hero-dark/60 hover:text-white"
      >
        <Copy className="h-3.5 w-3.5" />
        {t("inventory.duplicate")}
      </button>

      {canSplit ? (
        <button
          type="button"
          onClick={() => onAction("split")}
          className="flex w-full items-center gap-2 px-3 py-1.5 font-libre text-xs text-gray-300 hover:bg-hero-dark/60 hover:text-white"
        >
          <Scissors className="h-3.5 w-3.5" />
          {t("inventory.split")}
        </button>
      ) : null}

      {canConsume ? (
        <button
          type="button"
          onClick={() => onAction("consume")}
          className="flex w-full items-center gap-2 px-3 py-1.5 font-libre text-xs text-gray-300 hover:bg-hero-dark/60 hover:text-white"
        >
          <Utensils className="h-3.5 w-3.5" />
          {t("inventory.consume")}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onAction("delete")}
        className="flex w-full items-center gap-2 px-3 py-1.5 font-libre text-xs text-red-400 hover:bg-red-950/40"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("equipment.delete")}
      </button>
    </div>
  );
}
