"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ShoppingBag, Store } from "lucide-react";
import { shopArchetypeLabel } from "@/src/lib/shop-archetypes";

export type LiveCampaignShopOption = {
  id: string;
  name: string;
  shop_mode: "archetype" | "unique";
  archetype_key: string | null;
};

type Props = {
  npcName: string;
  isMerchant: boolean;
  isShopOpen: boolean;
  shops: LiveCampaignShopOption[];
  isBusy: boolean;
  onAssignAndOpen: (shopId: string) => void;
  onToggleShop: () => void;
};

export function StageNpcShopControls({
  npcName,
  isMerchant,
  isShopOpen,
  shops,
  isBusy,
  onAssignAndOpen,
  onToggleShop,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [pickerOpen]);

  if (isMerchant) {
    return (
      <button
        type="button"
        disabled={isBusy}
        aria-label={
          isShopOpen
            ? `Shop von ${npcName} für Spieler schließen`
            : `Shop von ${npcName} für Spieler öffnen`
        }
        onClick={(event) => {
          event.stopPropagation();
          onToggleShop();
        }}
        className="absolute left-0 top-10 inline-flex items-center gap-1 rounded-full border border-accent-gold/70 bg-background-dark/95 px-2.5 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold shadow-lg backdrop-blur transition-colors hover:bg-accent-gold hover:text-black disabled:opacity-60"
        title={isShopOpen ? "Shop für alle schließen" : "Shop für alle öffnen — Spieler können handeln"}
      >
        {isBusy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ShoppingBag className="h-3 w-3" />
        )}
        {isShopOpen ? "Shop schließen" : "Shop öffnen"}
      </button>
    );
  }

  return (
    <div ref={rootRef} className="absolute left-0 top-10 z-40">
      <button
        type="button"
        disabled={isBusy || shops.length === 0}
        aria-label={`${npcName} als Shopinhaber markieren`}
        aria-expanded={pickerOpen}
        onClick={(event) => {
          event.stopPropagation();
          if (shops.length === 0) return;
          setPickerOpen((value) => !value);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-hero-vibrant/60 bg-background-dark/95 px-2.5 py-1 font-barlow text-[10px] font-bold uppercase text-hero-vibrant shadow-lg backdrop-blur transition-colors hover:bg-hero-vibrant hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        title={
          shops.length === 0
            ? "Lege zuerst einen Shop unter Kampagne → Shops an"
            : "Shop-Template zuweisen und Handel starten"
        }
      >
        {isBusy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Store className="h-3 w-3" />
        )}
        Händler
      </button>

      {pickerOpen && shops.length > 0 ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-hero-border/60 bg-slate-950/95 shadow-2xl backdrop-blur">
          <p className="border-b border-hero-border/40 px-3 py-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Template wählen
          </p>
          <ul className="max-h-48 overflow-y-auto py-1">
            {shops.map((shop) => (
              <li key={shop.id}>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPickerOpen(false);
                    onAssignAndOpen(shop.id);
                  }}
                  className="w-full px-3 py-2 text-left font-libre text-xs text-gray-100 transition-colors hover:bg-hero-vibrant/20 disabled:opacity-50"
                >
                  <span className="block font-barlow text-[11px] font-bold uppercase text-white">
                    {shop.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-gray-400">
                    {shop.shop_mode === "archetype"
                      ? shopArchetypeLabel(shop.archetype_key)
                      : "Unique-Katalog"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
