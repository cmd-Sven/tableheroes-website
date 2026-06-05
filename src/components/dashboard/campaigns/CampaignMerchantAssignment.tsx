"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Save, ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";
import { updateNpcMerchantAssignment } from "@/src/app/dashboard/campaigns/[id]/shop-actions";
import type { CampaignShopRow } from "@/src/app/dashboard/campaigns/[id]/shop-queries";
import type { MerchantAssignableNpc } from "@/src/app/dashboard/campaigns/[id]/shop-queries";
import { shopArchetypeLabel } from "@/src/lib/shop-archetypes";

type Props = {
  campaignId: string;
  shops: CampaignShopRow[];
  npcs: MerchantAssignableNpc[];
};

type RowState = {
  isMerchant: boolean;
  shopId: string;
};

function shopLabel(shop: CampaignShopRow): string {
  const mod =
    shop.price_modifier_percent !== 0
      ? ` (${shop.price_modifier_percent > 0 ? "+" : ""}${shop.price_modifier_percent}%)`
      : "";
  if (shop.shop_mode === "archetype" && shop.archetype_key) {
    return `${shop.name} — ${shopArchetypeLabel(shop.archetype_key)}${mod}`;
  }
  return `${shop.name}${mod}`;
}

export function CampaignMerchantAssignment({
  campaignId,
  shops,
  npcs,
}: Props) {
  const initialRows = useMemo(() => {
    const map: Record<string, RowState> = {};
    for (const npc of npcs) {
      map[npc.id] = {
        isMerchant: npc.is_merchant,
        shopId: npc.shop_id ?? "",
      };
    }
    return map;
  }, [npcs]);

  const [rows, setRows] = useState<Record<string, RowState>>(initialRows);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedNpcs = useMemo(
    () => [...npcs].sort((a, b) => a.name.localeCompare(b.name, "de")),
    [npcs],
  );

  const saveRow = (npcId: string) => {
    const row = rows[npcId];
    if (!row) return;
    if (row.isMerchant && !row.shopId) {
      toast.error("Bitte ein Shop-Template wählen.");
      return;
    }

    setSavingId(npcId);
    startTransition(async () => {
      const result = await updateNpcMerchantAssignment(
        campaignId,
        npcId,
        row.isMerchant,
        row.isMerchant ? row.shopId : null,
      );
      setSavingId(null);
      if (!result.success) {
        toast.error(result.error || "Speichern fehlgeschlagen.");
        return;
      }
      toast.success("Händler-Zuordnung gespeichert.");
    });
  };

  if (shops.length === 0) {
    return (
      <div className="rounded-lg border border-amber-600/40 bg-amber-950/20 p-5 font-libre text-sm text-amber-100">
        Lege zuerst mindestens einen Shop an, bevor du NPCs als Händler zuweisen kannst.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-hero-border pb-3">
        <div>
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood flex items-center gap-2">
            <Store className="h-6 w-6 text-accent-gold" />
            NPCs als Shopinhaber
          </h2>
          <p className="mt-2 max-w-3xl font-libre text-sm text-gray-300 leading-relaxed">
            Weise NPCs ein Shop-Template zu. In der Live-Session kannst du am NPC „Shop
            öffnen“ klicken — Spieler sehen dann Waren und Preise auf der Bühne (Ruf
            beeinflusst die Preise).
          </p>
        </div>
      </div>

      {sortedNpcs.length === 0 ? (
        <p className="font-libre text-sm text-gray-400 italic">
          In der Welt dieser Kampagne gibt es noch keine NPCs.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left font-libre text-sm text-gray-200">
            <thead>
              <tr className="border-b border-hero-border/60 font-barlow text-xs font-bold uppercase text-gray-500">
                <th className="py-2 pr-4">NPC</th>
                <th className="py-2 pr-4 w-28">Händler</th>
                <th className="py-2 pr-4">Shop-Template</th>
                <th className="py-2 w-28" />
              </tr>
            </thead>
            <tbody>
              {sortedNpcs.map((npc) => {
                const row = rows[npc.id] ?? {
                  isMerchant: false,
                  shopId: "",
                };
                const busy = isPending && savingId === npc.id;

                return (
                  <tr
                    key={npc.id}
                    className="border-b border-hero-border/30 align-middle"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {npc.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={npc.image_url}
                            alt=""
                            className="h-10 w-10 rounded-full border border-hero-border object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-hero-border/60 bg-hero-dark/40 text-xs text-gray-500">
                            NPC
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/dashboard/campaigns/${campaignId}/npcs/${npc.id}`}
                            className="font-barlow font-bold text-white hover:text-accent-gold"
                          >
                            {npc.name}
                          </Link>
                          {(npc.title || npc.role) && (
                            <p className="font-libre text-xs text-gray-500">
                              {[npc.title, npc.role].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.isMerchant}
                          onChange={(e) =>
                            setRows((prev) => ({
                              ...prev,
                              [npc.id]: {
                                ...row,
                                isMerchant: e.target.checked,
                                shopId: e.target.checked ? row.shopId : "",
                              },
                            }))
                          }
                          className="h-4 w-4 rounded border-hero-dark text-accent-gold focus:ring-accent-gold"
                        />
                        <ShoppingBag className="h-4 w-4 text-accent-gold" />
                      </label>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={row.shopId}
                        disabled={!row.isMerchant}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [npc.id]: { ...row, shopId: e.target.value },
                          }))
                        }
                        className="w-full max-w-md rounded border border-hero-dark bg-slate-900/80 p-2 text-sm text-white outline-none focus:border-accent-gold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">— Shop wählen —</option>
                        {shops.map((shop) => (
                          <option key={shop.id} value={shop.id}>
                            {shopLabel(shop)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => saveRow(npc.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded border border-accent-gold/60 bg-accent-gold/10 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Speichern
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
