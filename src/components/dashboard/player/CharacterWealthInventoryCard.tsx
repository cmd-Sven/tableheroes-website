"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Coins } from "lucide-react";
import { getCharacterInventory } from "@/src/lib/actions/character-inventory-actions";
import { PrivateInventoryModal } from "@/src/components/inventory/PrivateInventoryModal";
import type { CharacterWealth } from "@/src/types/inventory";

type CharacterSummary = {
  id: string;
  name: string;
  class: string | null;
  level: number | null;
  avatar_url: string | null;
};

function emptyWealth(characterId: string): CharacterWealth {
  return {
    id: "",
    character_id: characterId,
    gp: 0,
    sp: 0,
    cp: 0,
    ep: 0,
    pp: 0,
    gem_data: [],
  };
}

function coinBadge(label: string, value: number) {
  return (
    <span className="rounded border border-white/10 bg-black/25 px-2 py-1 font-barlow text-xs font-bold uppercase text-stone-100">
      {label} <span className="text-accent-gold">{value.toLocaleString("de-DE")}</span>
    </span>
  );
}

export function CharacterWealthInventoryCard({
  character,
}: {
  character: CharacterSummary;
}) {
  const [wealth, setWealth] = useState<CharacterWealth>(() => emptyWealth(character.id));
  const [error, setError] = useState<string | null>(null);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadWealth = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const inventory = await getCharacterInventory(character.id);
        setWealth(inventory.wealth);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Währung konnte nicht geladen werden.",
        );
      }
    });
  }, [character.id]);

  useEffect(() => {
    loadWealth();
  }, [loadWealth]);

  const gemTotal = useMemo(
    () =>
      wealth.gem_data.reduce(
        (sum, gem) => sum + Math.max(0, Number(gem.estimated_value) || 0),
        0,
      ),
    [wealth.gem_data],
  );

  const totalGoldValue =
    wealth.gp + wealth.pp * 10 + wealth.ep / 2 + wealth.sp / 10 + wealth.cp / 100 + gemTotal;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-white/10 bg-player-marble p-4 shadow-inner">
        <div className="flex min-w-0 items-start gap-3">
          <Coins className="mt-0.5 h-5 w-5 shrink-0 text-accent-gold" />
          <div className="min-w-0">
            <p className="font-barlow font-bold text-xs uppercase text-stone-400">
              Währung & Rucksack
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {coinBadge("GP", wealth.gp)}
              {coinBadge("SP", wealth.sp)}
              {coinBadge("CP", wealth.cp)}
              {coinBadge("EP", wealth.ep)}
              {coinBadge("PP", wealth.pp)}
            </div>
            <p className="mt-2 font-libre text-sm text-stone-300">
              Gesamtwert inkl. Edelsteine:{" "}
              <span className="font-barlow font-bold text-accent-gold">
                {totalGoldValue.toLocaleString("de-DE", {
                  maximumFractionDigits: 2,
                })}{" "}
                GP
              </span>
            </p>
            {gemTotal > 0 ? (
              <p className="font-libre text-xs text-stone-500">
                Edelsteine: {gemTotal.toLocaleString("de-DE")} GP geschätzt
              </p>
            ) : null}
            {error ? <p className="mt-1 font-libre text-xs text-red-300">{error}</p> : null}
            {isPending ? (
              <p className="mt-1 font-libre text-xs text-stone-500">Wird geladen...</p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsInventoryOpen(true)}
          className="shrink-0 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-gold"
          title={`Rucksack von ${character.name} öffnen`}
          aria-label={`Rucksack von ${character.name} öffnen`}
        >
          <Image
            src="/images/Session_ui/rucksack.png"
            alt=""
            width={64}
            height={64}
            className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.85)]"
          />
        </button>
      </div>

      {isInventoryOpen ? (
        <PrivateInventoryModal
          character={character}
          onClose={() => {
            setIsInventoryOpen(false);
            loadWealth();
          }}
        />
      ) : null}
    </>
  );
}
