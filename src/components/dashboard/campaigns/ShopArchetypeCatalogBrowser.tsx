"use client";

import { useMemo, useState } from "react";
import {
  SHOP_ARCHETYPES,
  type ShopArchetypeKey,
} from "@/src/lib/shop-archetypes";
import {
  formatItemDetails,
  getCatalogEntryCount,
  getCatalogForArchetype,
  hasCatalogContent,
} from "@/src/lib/shop-catalog";
import { catalogItemToCopper } from "@/src/lib/dnd-currency";
import { DndCoinDisplay } from "@/src/components/currency/DndCoinDisplay";

function groupByCatalogGroup<T extends { catalogGroup?: string }>(
  items: T[],
): { title: string; rows: T[] }[] {
  const map = new Map<string, T[]>();
  for (const row of items) {
    const g = row.catalogGroup ?? "";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(row);
  }
  const out: { title: string; rows: T[] }[] = [];
  for (const [title, rows] of map) {
    out.push({ title: title || "Alle Einträge", rows });
  }
  return out;
}

export function ShopArchetypeCatalogBrowser() {
  const [archetype, setArchetype] = useState<ShopArchetypeKey>("waffenmeister");

  const items = useMemo(
    () => getCatalogForArchetype(archetype),
    [archetype],
  );

  const grouped = useMemo(() => groupByCatalogGroup(items), [items]);

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
        Standardkatalog (Warenlisten)
      </h2>
      <p className="font-libre text-sm text-gray-300 leading-relaxed mb-4">
        Archetyp-Shops beziehen ihre Artikel aus diesen vordefinierten Listen.
        Der Preismodifikator deines Shops (z. B. +10 %) rechnest du am Tisch
        oder später in der App auf diese Basispreise drauf.
      </p>

      <div className="mb-6">
        <label
          htmlFor="catalog-archetype"
          className="mb-2 block font-barlow font-bold uppercase text-xs text-gray-300"
        >
          Shop-Typ wählen
        </label>
        <select
          id="catalog-archetype"
          value={archetype}
          onChange={(e) =>
            setArchetype(e.target.value as ShopArchetypeKey)
          }
          className="w-full max-w-md rounded bg-slate-900 border border-hero-dark p-2.5 text-white focus:border-hero-vibrant outline-none font-libre"
        >
          {SHOP_ARCHETYPES.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
              {hasCatalogContent(a.key)
                ? ` (${getCatalogEntryCount(a.key)})`
                : ""}
            </option>
          ))}
        </select>
      </div>

      {!hasCatalogContent(archetype) ? (
        <p className="font-libre text-gray-400 border border-hero-border/40 rounded-md p-4 bg-background-dark/50">
          Für diesen Archetyp ist in TableHeroes noch kein Standardkatalog
          hinterlegt. Du kannst trotzdem einen Archetyp-Shop anlegen; die Liste
          folgt in einem späteren Update oder du nutzt einen{" "}
          <strong className="text-gray-300">Unique</strong>-Shop mit eigenen
          Positionen (kommt als Nächstes).
        </p>
      ) : (
        <div className="space-y-8 overflow-x-auto">
          {grouped.map((section) => (
            <div key={section.title}>
              {section.title !== "Alle Einträge" ? (
                <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3">
                  {section.title}
                </h3>
              ) : null}
              <table className="w-full min-w-[720px] text-left font-libre text-sm text-gray-200 border-collapse">
                <thead>
                  <tr className="border-b border-hero-border font-barlow text-xs font-bold uppercase text-gray-500">
                    <th className="py-2 pr-3 align-bottom">Name</th>
                    <th className="py-2 pr-3 align-bottom">Kategorie</th>
                    <th className="py-2 pr-3 align-bottom">Seltenheit</th>
                    <th className="py-2 pr-3 align-bottom whitespace-nowrap">
                      Preis
                    </th>
                    <th className="py-2 pr-3 align-bottom whitespace-nowrap">
                      Gewicht
                    </th>
                    <th className="py-2 align-bottom">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-hero-border/25 align-top"
                    >
                      <td className="py-2.5 pr-3 font-medium text-white">
                        {item.name}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-300">
                        {item.categoryLabel}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-400">
                        {item.rarity ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-accent-gold">
                        {(() => {
                          const cp = catalogItemToCopper(item);
                          if (cp > 0) {
                            return <DndCoinDisplay totalCp={cp} size="sm" />;
                          }
                          if (item.priceLabel) return item.priceLabel;
                          return "—";
                        })()}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {item.weightLb != null ? `${item.weightLb} lb.` : "—"}
                      </td>
                      <td className="py-2.5 text-gray-400 max-w-md">
                        {formatItemDetails(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
