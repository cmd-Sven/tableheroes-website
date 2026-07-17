"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeftRight,
  Backpack,
  Copy,
  Gift,
  Pencil,
  Scissors,
  Tags,
  Trash2,
} from "lucide-react";
import type { InventoryStack } from "@/src/lib/characters/dnd5e/inventory-stacking";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

export type ContextMenuAction =
  | "edit"
  | "delete"
  | "duplicate"
  | "split"
  | "move"
  | "give"
  | "assignCategory"
  | "equipAsContainer";

type Props = {
  stack: InventoryStack;
  position: { x: number; y: number };
  readOnly: boolean;
  canGive: boolean;
  canEquipAsContainer?: boolean;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
};

export function InventoryItemContextMenu({
  stack,
  position,
  readOnly,
  canGive,
  canEquipAsContainer = false,
  onAction,
  onClose,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const ref = useRef<HTMLDivElement>(null);
  const canSplit = stack.quantity > 1;

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

  const items: {
    action: ContextMenuAction;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    danger?: boolean;
    hidden?: boolean;
  }[] = [
    { action: "edit", label: t("equipment.edit"), icon: Pencil },
    { action: "assignCategory", label: t("inventory.assignCategory"), icon: Tags },
    {
      action: "equipAsContainer",
      label: t("inventory.equipAsContainer"),
      icon: Backpack,
      hidden: !canEquipAsContainer,
    },
    { action: "delete", label: t("equipment.delete"), icon: Trash2, danger: true },
    { action: "duplicate", label: t("inventory.duplicate"), icon: Copy },
    { action: "split", label: t("inventory.split"), icon: Scissors, hidden: !canSplit },
    { action: "move", label: t("inventory.move"), icon: ArrowLeftRight },
    { action: "give", label: t("inventory.give"), icon: Gift, hidden: !canGive },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-90 min-w-[170px] rounded-lg border border-hero-border bg-background-card py-1 shadow-2xl"
      style={{
        left: Math.min(position.x, window.innerWidth - 190),
        top: Math.min(position.y, window.innerHeight - 280),
      }}
    >
      <p className="border-b border-hero-border/40 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold truncate">
        {stack.representative.name}
        {stack.quantity > 1 ? ` ×${stack.quantity}` : ""}
      </p>

      {items
        .filter((item) => !item.hidden)
        .map(({ action, label, icon: Icon, danger }) => (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 font-libre text-xs hover:bg-hero-dark/60 ${
              danger ? "text-red-400 hover:text-red-300" : "text-gray-300 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
    </div>
  );
}
