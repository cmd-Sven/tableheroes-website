"use client";

import { Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CharacterItem } from "@/src/types/inventory";
import { resolveItemEffectInfo } from "@/src/lib/characters/dnd5e/item-effect-info";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

/** Goldener Rand/Schein für magische Gegenstände — nur Ring und Schatten, kein Layout. */
export const MAGICAL_ITEM_RING_CLASS =
  "ring-1 ring-accent-gold shadow-[0_0_8px_rgba(202,185,38,0.5)]";

type Props = {
  item: CharacterItem;
};

function DescriptionWithDice({ text, dice }: { text: string; dice: string[] }) {
  if (dice.length === 0) {
    return <p className="font-libre text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">{text}</p>;
  }
  const pattern = dice
    .map((entry) => entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"))
    .join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  const diceKeys = new Set(dice.map((entry) => entry.replace(/\s+/g, "").toLowerCase()));
  return (
    <p className="font-libre text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
      {parts.map((part, index) =>
        diceKeys.has(part.replace(/\s+/g, "").toLowerCase()) ? (
          <span key={index} className="font-barlow font-bold text-accent-gold">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

export function ItemEffectInfoButton({ item }: Props) {
  const { t, locale } = useCharacterSheetLocale();
  const info = resolveItemEffectInfo(item, locale);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!info) return null;

  const kinds = [
    info.isMagical ? t("inventory.itemInfoKindMagic") : null,
    info.isPotion ? t("inventory.itemInfoKindPotion") : null,
    info.isScroll ? t("inventory.itemInfoKindScroll") : null,
  ].filter(Boolean);
  const levelLabel =
    info.spellLevel == null
      ? null
      : info.spellLevel <= 0
        ? t("spells.cantrips")
        : t("spells.levelHeading", { level: info.spellLevel });
  const hasFacts = Boolean(
    info.spellName ||
      levelLabel ||
      info.spellSchool ||
      info.dice.length ||
      info.damageLine ||
      info.magicalBonus ||
      info.acBonus ||
      info.attunement ||
      info.duration ||
      info.charges,
  );

  function stopDrag(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        draggable={false}
        aria-label={t("inventory.itemInfoAria", { name: item.name })}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="absolute right-0 top-0 z-30 flex h-4 w-4 items-center justify-center rounded-full border border-accent-gold bg-background-card text-accent-gold"
        onPointerDown={stopDrag}
        onMouseDown={stopDrag}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        onDragStart={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <Info className="h-2.5 w-2.5" aria-hidden />
      </button>
      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              role="presentation"
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3
                    id={titleId}
                    className={`font-barlow text-lg font-bold uppercase tracking-wide ${
                      info.isMagical ? "text-accent-gold" : "text-hero-vibrant"
                    }`}
                  >
                    {item.name}
                  </h3>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
                    aria-label={t("inventory.itemInfoCloseAria")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {kinds.length > 0 ? (
                  <p className="mb-3 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                    {kinds.join(" · ")}
                  </p>
                ) : null}
                <dl className="mb-3 space-y-1.5">
                  {info.spellName ? (
                    <div className="flex gap-2">
                      <dt className="font-barlow text-xs font-bold uppercase text-gray-400">
                        {t("inventory.itemInfoSpell")}
                      </dt>
                      <dd className="font-libre text-sm text-gray-200">{info.spellName}</dd>
                    </div>
                  ) : null}
                  {levelLabel ? (
                    <div className="flex gap-2">
                      <dt className="font-barlow text-xs font-bold uppercase text-gray-400">
                        {t("inventory.itemInfoLevel")}
                      </dt>
                      <dd className="font-libre text-sm text-gray-200">{levelLabel}</dd>
                    </div>
                  ) : null}
                  {info.spellSchool ? (
                    <div className="flex gap-2">
                      <dt className="font-barlow text-xs font-bold uppercase text-gray-400">
                        {t("inventory.itemInfoSchool")}
                      </dt>
                      <dd className="font-libre text-sm text-gray-200">{info.spellSchool}</dd>
                    </div>
                  ) : null}
                  {info.dice.length > 0 ? (
                    <div className="flex gap-2">
                      <dt className="font-barlow text-xs font-bold uppercase text-accent-gold">
                        {t("inventory.itemInfoDice")}
                      </dt>
                      <dd className="font-barlow text-sm font-bold text-accent-gold">
                        {info.dice.join(", ")}
                      </dd>
                    </div>
                  ) : null}
                  {info.damageLine ? (
                    <div className="flex gap-2">
                      <dt className="font-barlow text-xs font-bold uppercase text-gray-400">
                        {t("inventory.itemInfoDamage")}
                      </dt>
                      <dd className="font-libre text-sm text-gray-200">{info.damageLine}</dd>
                    </div>
                  ) : null}
                  {info.magicalBonus != null ? (
                    <div className="flex gap-2">
                      <dt className="font-barlow text-xs font-bold uppercase text-gray-400">
                        {t("inventory.itemInfoBonus")}
                      </dt>
                      <dd className="font-libre text-sm text-accent-gold">
                        {info.magicalBonus > 0 ? `+${info.magicalBonus}` : info.magicalBonus}
                      </dd>
                    </div>
                  ) : null}
                  {info.acBonus != null ? (
                    <div className="flex gap-2">
                      <dt className="font-barlow text-xs font-bold uppercase text-gray-400">
                        {t("inventory.itemInfoAc")}
                      </dt>
                      <dd className="font-libre text-sm text-gray-200">+{info.acBonus}</dd>
                    </div>
                  ) : null}
                  {info.duration ? (
                    <div className="flex gap-2">
                      <dt className="font-barlow text-xs font-bold uppercase text-gray-400">
                        {t("inventory.itemInfoDuration")}
                      </dt>
                      <dd className="font-libre text-sm text-gray-200">{info.duration}</dd>
                    </div>
                  ) : null}
                  {info.charges ? (
                    <div className="flex gap-2">
                      <dt className="font-barlow text-xs font-bold uppercase text-gray-400">
                        {t("inventory.itemInfoCharges")}
                      </dt>
                      <dd className="font-libre text-sm text-gray-200">{info.charges}</dd>
                    </div>
                  ) : null}
                  {info.attunement ? (
                    <div>
                      <dd className="font-barlow text-xs font-bold uppercase text-accent-gold">
                        {t("inventory.itemInfoAttunement")}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {info.body ? (
                  <DescriptionWithDice text={info.body} dice={info.dice} />
                ) : !hasFacts ? (
                  <p className="font-libre text-sm italic text-gray-400">{t("inventory.itemInfoEmpty")}</p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
