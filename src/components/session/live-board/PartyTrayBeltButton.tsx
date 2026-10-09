/**
 * PartyTrayBeltButton — Gürtelbild rechts am Live-Avatar.
 * Klick zeigt die Gürtelplätze des Charakterbogens über dem Portrait.
 */
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  getCharacterEquipmentPayload,
  type CharacterEquipmentPayload,
} from "@/src/lib/actions/character-inventory-actions";
import { useLiveSessionBeltItem } from "@/src/lib/actions/live-session-avatar-actions";
import { EquippedSlotTile } from "@/src/components/characters/inventory/EquippedSlotTile";
import { InventoryItemTile } from "@/src/components/characters/inventory/InventoryItemTile";
import { getSpecialItemFlags } from "@/src/lib/characters/dnd5e/item-effect-info";
import { parseDnd5eMetaFromDescription } from "@/src/lib/characters/dnd5e/item-meta";
import { hasWaistBeltEquipped } from "@/src/lib/characters/dnd5e/slot-validation";
import {
  CHARACTER_EQUIPMENT_CHANGED_EVENT,
  dispatchCharacterEquipmentChanged,
} from "@/src/lib/session/character-radial-bridge";
import {
  CharacterSheetLocaleProvider,
  useCharacterSheetLocale,
} from "@/src/lib/i18n/character-sheet/context";
import type { CharacterItem } from "@/src/types/inventory";

type Props = {
  compact: boolean;
  sessionId: string;
  campaignId: string;
  characterId: string;
  characterName: string;
};

type Anchor = { x: number; top: number };

function itemQuantity(item: CharacterItem): number {
  return Math.max(1, Math.round(Number(parseDnd5eMetaFromDescription(item.description)?.quantity) || 1));
}

function readFrameAnchor(button: HTMLButtonElement | null): Anchor | null {
  if (!button) return null;
  const frame = button.offsetParent instanceof HTMLElement ? button.offsetParent : button;
  const rect = frame.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, top: rect.top };
}

export function PartyTrayBeltButton({
  compact,
  sessionId,
  campaignId,
  characterId,
  characterName,
}: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <motion.button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-label={`Gürtel von ${characterName} öffnen`}
        title={`Gürtel von ${characterName} öffnen`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((current) => !current);
        }}
        initial={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.16, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className={`absolute z-40 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent-gold ${
          compact ? "-right-4 top-[42px]" : "-right-10 top-[78px]"
        }`}
      >
        <Image
          src="/images/session/guertel.png"
          alt=""
          width={compact ? 52 : 112}
          height={compact ? 43 : 92}
          className="pointer-events-none drop-shadow-[0_3px_5px_rgba(0,0,0,0.85)]"
        />
      </motion.button>
      {open ? (
        <PartyTrayBeltStrip
          sessionId={sessionId}
          campaignId={campaignId}
          characterId={characterId}
          characterName={characterName}
          buttonRef={buttonRef}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function PartyTrayBeltStrip({
  sessionId,
  campaignId,
  characterId,
  characterName,
  buttonRef,
  onClose,
}: {
  sessionId: string;
  campaignId: string;
  characterId: string;
  characterName: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [payload, setPayload] = useState<CharacterEquipmentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await getCharacterEquipmentPayload(characterId);
      setPayload(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gürtel konnte nicht geladen werden.");
    }
  }, [characterId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    function onEquipmentChanged(e: Event) {
      const detail = (e as CustomEvent<{ characterId?: string }>).detail;
      if (detail?.characterId !== characterId) return;
      void reload();
    }
    window.addEventListener(CHARACTER_EQUIPMENT_CHANGED_EVENT, onEquipmentChanged);
    return () => window.removeEventListener(CHARACTER_EQUIPMENT_CHANGED_EVENT, onEquipmentChanged);
  }, [characterId, reload]);

  useLayoutEffect(() => {
    const update = () => setAnchor(readFrameAnchor(buttonRef.current));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [buttonRef]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (stripRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-belt-ui], [role='dialog']")) return;
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [buttonRef, onClose]);

  if (!mounted || !anchor) return null;

  return createPortal(
    <div
      ref={stripRef}
      data-belt-ui=""
      className="pointer-events-auto fixed z-[80] w-max max-w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-full rounded-lg border border-hero-border bg-background-card/95 px-2 py-2 shadow-2xl"
      style={{ left: anchor.x, top: anchor.top - 8 }}
      role="region"
      aria-label={`Gürtel von ${characterName}`}
    >
      {error ? (
        <p className="px-2 py-1 font-libre text-xs text-red-200">{error}</p>
      ) : !payload ? (
        <p className="px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
          Gürtel wird geladen…
        </p>
      ) : (
        <CharacterSheetLocaleProvider
          campaignId={payload.campaignId || campaignId}
          characterId={characterId}
          initialLocale={payload.sheetLocale}
        >
          <BeltSlots
            sessionId={sessionId}
            characterId={characterId}
            characterName={characterName}
            payload={payload}
            onClose={onClose}
          />
        </CharacterSheetLocaleProvider>
      )}
    </div>,
    document.body,
  );
}

function BeltSlots({
  sessionId,
  characterId,
  characterName,
  payload,
  onClose,
}: {
  sessionId: string;
  characterId: string;
  characterName: string;
  payload: CharacterEquipmentPayload;
  onClose: () => void;
}) {
  const { t } = useCharacterSheetLocale();
  const [pending, startTransition] = useTransition();
  const [menu, setMenu] = useState<{
    item: CharacterItem;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemMap = new Map(payload.items.filter((item) => !item.is_deleted).map((item) => [item.id, item]));
  const beltEquipped = hasWaistBeltEquipped(payload.equipment.slots);

  useEffect(() => {
    if (!menu) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      setMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function consume(item: CharacterItem) {
    startTransition(async () => {
      try {
        await useLiveSessionBeltItem({
          sessionId,
          characterId,
          characterName,
          itemId: item.id,
        });
        dispatchCharacterEquipmentChanged(characterId);
        setMenu(null);
        toast.success(t("inventory.consumeTitle", { name: item.name }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Verbrauchen fehlgeschlagen.");
      }
    });
  }

  return (
    <>
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
          {t("equipment.uiWaist")}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-gray-400 transition-colors duration-200 hover:text-white"
          aria-label="Gürtel schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {!beltEquipped ? (
        <p className="mb-1 px-1 font-libre text-[9px] leading-snug text-amber-500/90">
          {t("equipment.beltRequiresWaist")}
        </p>
      ) : null}
      <div className="flex items-end justify-center gap-1">
        {payload.equipment.belt.map((itemId, index) => {
          const item = itemId ? itemMap.get(itemId) : undefined;
          if (!item) {
            return (
              <EquippedSlotTile
                key={`empty-${index}`}
                item={undefined}
                readOnly
                emptyLabel={String(index + 1)}
                title={t("equipment.beltSlot", { n: index + 1 })}
              />
            );
          }
          const isPotion = getSpecialItemFlags(item)?.isPotion === true;
          return (
            <InventoryItemTile
              key={item.id}
              item={item}
              quantity={itemQuantity(item)}
              customCategories={payload.equipment.customCategories}
              readOnly
              onContextMenu={
                isPotion
                  ? (e) => {
                      setMenu({ item, x: e.clientX, y: e.clientY });
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
      {menu
        ? createPortal(
            <div
              ref={menuRef}
              data-belt-ui=""
              className="fixed z-[230] min-w-[150px] rounded-lg border border-hero-border bg-background-card py-1 shadow-2xl"
              style={{
                left: Math.min(menu.x, window.innerWidth - 170),
                top: Math.min(menu.y, window.innerHeight - 72),
              }}
            >
              <p className="truncate border-b border-hero-border/40 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold">
                {menu.item.name}
                {itemQuantity(menu.item) > 1 ? ` ×${itemQuantity(menu.item)}` : ""}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => consume(menu.item)}
                className="flex w-full items-center px-3 py-1.5 text-left font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant transition-colors duration-200 hover:bg-hero-dark/60 disabled:opacity-40"
              >
                {t("inventory.consume")}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
