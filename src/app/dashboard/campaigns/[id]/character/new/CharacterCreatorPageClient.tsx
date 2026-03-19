"use client";

import { CharacterCreator } from "@/src/components/dashboard/CharacterCreator";

type Props = {
  campaignId: string;
  factions: any[];
  locations: any[];
  npcs: any[];
};

export function CharacterCreatorPageClient({ campaignId, factions, locations, npcs }: Props) {
  return (
    <CharacterCreator
      campaignId={campaignId}
      isOpen={true}
      onClose={() => {}}
      factions={factions}
      locations={locations}
      npcs={npcs}
      mode="page"
    />
  );
}
