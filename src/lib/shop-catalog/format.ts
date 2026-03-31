import type { DamageTypeDe, ShopCatalogItem } from "./types";

function damageTypeLabel(t: DamageTypeDe): string {
  if (t === "Wucht") return "Wuchtschaden";
  if (t === "Hieb") return "Hiebschaden";
  return "Stichschaden";
}

export function formatItemPrice(item: ShopCatalogItem): string {
  if (item.priceLabel) return item.priceLabel;
  const parts: string[] = [];
  if (item.priceGp != null && item.priceGp > 0) {
    parts.push(`${item.priceGp} GP`);
  }
  if (item.priceSp != null && item.priceSp > 0) {
    parts.push(`${item.priceSp} SP`);
  }
  if (item.priceCp != null && item.priceCp > 0) {
    parts.push(`${item.priceCp} CP`);
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function formatItemDetails(item: ShopCatalogItem): string {
  const lines: string[] = [];

  if (item.kind === "weapon") {
    const dmg = [
      item.damage,
      item.damageType ? damageTypeLabel(item.damageType) : "",
    ]
      .filter(Boolean)
      .join(" ");
    if (dmg.trim()) lines.push(`Schaden: ${dmg}`);
    if (item.properties?.length) {
      lines.push(`Eigenschaften: ${item.properties.join(", ")}`);
    }
    if (item.rangeMeters) {
      lines.push(`Reichweite: ${item.rangeMeters} m`);
    }
  }

  if (item.kind === "armor") {
    if (item.isShield) {
      lines.push("Schild: +2 RK bei ausgerüstetem Schild");
    } else if (item.acFormula) {
      lines.push(`RK: ${item.acFormula}`);
    }
    if (item.strRequirement != null) {
      lines.push(`Stärke: ${item.strRequirement}+ (sonst Abzüge)`);
    }
    if (item.stealthDisadvantage) {
      lines.push("Nachteil auf Heimlichkeit");
    }
  }

  if (
    item.kind === "consumable" ||
    item.kind === "magic" ||
    item.kind === "equipment"
  ) {
    if (item.effect) lines.push(item.effect);
    if (item.duration) lines.push(`Dauer: ${item.duration}`);
    if (item.charges) lines.push(`Ladungen: ${item.charges}`);
    if (item.attunement === true) lines.push("Einstimmung erforderlich");
  }

  if (item.kind === "tool" || item.kind === "supply") {
    if (item.effect) lines.push(item.effect);
  }

  if (item.notes && !item.notes.match(/^\d/)) {
    lines.push(item.notes);
  }

  return lines.length > 0 ? lines.join(" · ") : "—";
}
