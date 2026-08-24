/**
 * AI shop item generation server actions for campaign shops.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import {
  callOpenAI,
  normalizeShopItemRarity,
  normalizeShopItemType,
} from "./_shared";

export async function generateShopItemsWithAI(payload: {
  npcContext: string;
  itemCount: number;
  legality: string;
  itemDirection: string;
  magicItemCount: number;
  includeServices: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const itemCount = Math.max(1, Math.min(30, Math.round(Number(payload.itemCount) || 10)));
  const magicItemCount = Math.max(
    0,
    Math.min(itemCount, Math.round(Number(payload.magicItemCount) || 0)),
  );
  const npcContext = String(payload.npcContext ?? "").trim() || "Kein spezifischer Händler-Kontext.";
  const itemDirection = String(payload.itemDirection ?? "").trim() || "Passende Waren für diesen Händler.";
  const legality = String(payload.legality ?? "Gemischt").trim() || "Gemischt";

  const systemPrompt = `Du bist ein meisterhafter D&D 5e Dungeon Master. Generiere ein Shop-Inventar basierend auf folgenden Parametern:

Händler-Kontext: ${npcContext}

Anzahl Gesamt-Items: ${itemCount}

Fokus der Waren: ${itemDirection}

Anzahl magischer/besonderer Items: ${magicItemCount}

Legalität: ${legality}

Dienstleistungen/Quests einbeziehen: ${payload.includeServices ? "Ja" : "Nein"}. (Dienstleistungen sind z.B. Reparaturen, Quests sind z.B. "Suche 10 Pilze").
Balanciere Preise strikt nach D&D 5e Standards in Goldmünzen (gp). Antworte AUSSCHLIESSLICH mit folgendem JSON-Format.

REGEL PROVIANT (zwingend):
- Wenn der Händler Vorräte, Proviant oder Reisebedarf anbietet, MUSS die Liste ein Item "Proviantpaket (2 Rationen)" enthalten: Preis exakt 1 GP, item_type "gear", rarity "common", is_magical false, is_legal true, is_ration_package true.
- Beschreibe kurz haltbare Reisekost (trocken, eingepökelt o.ä.).

{
  "items": [
    {
      "name": string,
      "description": string,
      "base_price_gp": number,
      "is_magical": boolean,
      "is_legal": boolean,
      "rarity": "common"|"uncommon"|"rare"|"very rare"|"legendary",
      "item_type": "weapon"|"armor"|"potion"|"gear"|"material"|"service"|"quest",
      "is_ration_package": boolean
    }
  ]
}`;

  const raw = await callOpenAI(
    systemPrompt,
    "Generiere jetzt das Shop-Inventar. Keine Zusatztexte, nur JSON.",
  );

  const rawItems = Array.isArray(raw?.items) ? raw.items : [];
  if (rawItems.length === 0) {
    throw new Error("Die KI hat kein gültiges Inventar geliefert.");
  }

  const proviantTemplate = {
    name: "Proviantpaket (2 Rationen)",
    description:
      "Haltbarer Proviant für unterwegs — beim Kauf +2 Rationen auf dem Charakter (max. 10).",
    base_price_gp: 1,
    is_magical: false,
    is_legal: true,
    rarity: "common" as const,
    item_type: "gear" as const,
    is_ration_package: true,
  };

  let mapped = rawItems.slice(0, itemCount).map((item: any) => {
      const isRationPack = Boolean(item?.is_ration_package);
      const price = Math.max(0, Math.round(Number(item?.base_price_gp) || 0));

      return {
        name: String(item?.name ?? "Unbenannter Gegenstand").trim().slice(0, 160),
        description: String(item?.description ?? "").trim().slice(0, 1200),
        base_price_gp: isRationPack ? 1 : price,
        is_magical: Boolean(item?.is_magical),
        is_legal: Boolean(item?.is_legal),
        rarity: normalizeShopItemRarity(item?.rarity),
        item_type: normalizeShopItemType(item?.item_type),
        is_ration_package: isRationPack,
      };
    });

  if (!mapped.some((i: { is_ration_package: boolean }) => i.is_ration_package)) {
    if (mapped.length < itemCount) {
      mapped = [...mapped, proviantTemplate];
    } else {
      mapped = [...mapped.slice(0, mapped.length - 1), proviantTemplate];
    }
  }

  return {
    items: mapped,
  };
}
