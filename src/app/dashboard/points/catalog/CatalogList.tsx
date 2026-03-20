"use client";

import { useState } from "react";
import Image from "next/image";
import { Award, Package, Coins } from "lucide-react";
import { redeemCatalogItem } from "@/src/lib/actions/points-catalog-actions";
import { getAchievementImageSrc } from "@/src/types/achievement";
import type { CatalogItem } from "@/src/lib/actions/points-catalog-actions";

type Props = {
  items: CatalogItem[];
  totalPoints: number;
  userId: string;
};

export function CatalogList({ items, totalPoints, userId }: Props) {
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRedeem(item: CatalogItem) {
    if (totalPoints < item.points_cost) {
      setError(`Du hast nur ${totalPoints} Punkte. Diese Belohnung kostet ${item.points_cost} Punkte.`);
      return;
    }
    setRedeemingId(item.id);
    setError(null);
    const result = await redeemCatalogItem(item.id, userId);
    setRedeemingId(null);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
  }

  if (items.length === 0) {
    return (
      <section
        className="rounded-lg border border-hero-dark bg-background-card p-12 shadow-lg text-center"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        <Package className="mx-auto h-16 w-16 text-gray-500" />
        <h2 className="font-barlow font-semibold text-xl text-accent-blood mt-4">
          Katalog ist leer
        </h2>
        <p className="font-libre text-gray-400 mt-2 max-w-md mx-auto">
          Der Spielleiter hat noch keine Belohnungen angelegt. Schau später
          wieder vorbei!
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg"
      style={{
        backgroundImage: "url('/images/dark-marmor.jpg')",
        backgroundSize: "cover",
      }}
    >
      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 px-4 py-2 font-libre text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const canAfford = totalPoints >= item.points_cost;
          const isRedeeming = redeemingId === item.id;

          const imageSrc = item.image_url
            ? item.image_url.startsWith("http") || item.image_url.startsWith("/")
              ? item.image_url
              : getAchievementImageSrc(item.image_url)
            : null;

          return (
            <div
              key={item.id}
              className="flex flex-col rounded-lg border border-hero-dark bg-hero-dark/30 overflow-hidden"
            >
              <div className="relative aspect-square bg-hero-dark/50 flex items-center justify-center">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={item.name}
                    width={200}
                    height={200}
                    className="object-contain p-4"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {item.type === "achievement" ? (
                      <Award className="h-20 w-20 text-accent-gold/50" />
                    ) : (
                      <Package className="h-20 w-20 text-accent-gold/50" />
                    )}
                  </div>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 font-barlow text-sm font-bold text-accent-gold">
                  <Coins className="h-4 w-4" />
                  {item.points_cost}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-cinzel font-bold text-lg text-white">
                  {item.name}
                </h3>
                {item.type === "achievement" && item.achievement_name && (
                  <p className="font-barlow text-xs uppercase text-accent-gold mt-0.5">
                    Achievement: {item.achievement_name}
                  </p>
                )}
                {item.description && (
                  <p className="font-libre text-sm text-gray-400 mt-2 flex-1">
                    {item.description}
                  </p>
                )}
                <button
                  onClick={() => handleRedeem(item)}
                  disabled={!canAfford || isRedeeming}
                  className="mt-4 w-full rounded border border-hero-border bg-hero-dark py-2 font-barlow font-bold uppercase text-hero-vibrant transition-colors hover:bg-hero-vibrant/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRedeeming
                    ? "Wird eingelöst…"
                    : canAfford
                    ? "Einlösen"
                    : "Nicht genug Punkte"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
