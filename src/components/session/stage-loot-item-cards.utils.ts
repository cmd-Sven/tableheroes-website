/**
 * stage-loot-item-cards.utils — Shared constants and layout helpers for stage loot cards.
 */
import { useEffect, useState } from "react";
import { disguisedLootDesc, disguisedLootTitle, type LootItemRow } from "@/src/lib/loot/loot-item-model";

export const CHEST_IMG_CLOSED = "/images/Session_ui/truhe_zu.webp";
export const CHEST_IMG_OPEN = "/images/Session_ui/truhe_offen.webp";
export const ITEM_CARD_BACK = "/images/Session_ui/itemcard_backside.webp";
export const MAX_STAGE_LOOT_ITEMS = 8;

export type ContainerRow = {
  id: string;
  name: string;
  gp_remaining: number;
  sp_remaining: number;
  chest_opened?: boolean;
  items_json: unknown;
  identify_requests?: unknown;
};

export function useTemporaryStageGlow() {
  const [showGlow, setShowGlow] = useState(false);
  useEffect(() => {
    setShowGlow(true);
    const t = window.setTimeout(() => setShowGlow(false), 4000);
    return () => window.clearTimeout(t);
  }, []);
  return showGlow;
}

export function displayLootItem(it: LootItemRow): { title: string; desc: string } {
  return { title: disguisedLootTitle(it), desc: disguisedLootDesc(it) };
}

function stableRotateFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 26) - 13;
}

export function computeRingLayout(
  stageW: number,
  stageH: number,
  itemIds: string[],
): { tx: number; ty: number; delay: number; flyRotateZ: number }[] {
  const n = itemIds.length;
  if (n === 0) return [];
  const pad = 14;
  const cardHalfW = 112;
  const cardHalfH = 118;
  const cy = Math.max(cardHalfH + pad, Math.min(stageH - cardHalfH - pad, stageH * 0.5));
  const maxRx = Math.max(64, Math.min(stageW / 2 - pad - cardHalfW * 0.85, 200 + n * 10));
  const maxRyUp = cy - pad - cardHalfH;
  const maxRyDown = stageH - cy - pad - cardHalfH;
  const maxRy = Math.max(48, Math.min(maxRyUp, maxRyDown, maxRx * 0.58));
  const rx = Math.min(maxRx, 88 + n * 14);
  const ry = Math.min(maxRy, rx * 0.55);

  return itemIds.map((id, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      tx: Math.cos(angle) * rx,
      ty: Math.sin(angle) * ry,
      delay: 0.08 * i,
      flyRotateZ: stableRotateFromId(id),
    };
  });
}
