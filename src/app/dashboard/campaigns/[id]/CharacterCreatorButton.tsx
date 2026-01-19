"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CharacterCreator } from "@/src/components/dashboard/CharacterCreator";

type Faction = {
  id: string;
  name: string;
  type: string;
  is_revealed?: boolean;
};

type Location = {
  id: string;
  name: string;
  type: string;
  is_revealed?: boolean;
};

type NPC = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
  is_revealed?: boolean;
};

type Props = {
  campaignId: string;
  factions?: Faction[];
  locations?: Location[];
  npcs?: NPC[];
};

export function CharacterCreatorButton({ campaignId, factions = [], locations = [], npcs = [] }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded bg-hero-vibrant px-6 py-3 font-barlow font-bold uppercase text-sm text-black transition-colors hover:bg-yellow-500 shadow-lg shadow-hero-vibrant/20"
      >
        <Plus className="h-4 w-4" />
        Charakter erstellen
      </button>

      {isOpen && (
        <CharacterCreator
          campaignId={campaignId}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          factions={factions}
          locations={locations}
          npcs={npcs}
        />
      )}
    </>
  );
}

