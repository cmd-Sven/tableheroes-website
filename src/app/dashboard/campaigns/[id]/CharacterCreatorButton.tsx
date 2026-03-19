"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

type Props = {
  campaignId: string;
};

export function CharacterCreatorButton({ campaignId }: Props) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/dashboard/campaigns/${campaignId}/character/new`)}
      className="flex items-center gap-2 rounded bg-hero-vibrant px-6 py-3 font-barlow font-bold uppercase text-sm text-black transition-colors hover:bg-yellow-500 shadow-lg shadow-hero-vibrant/20"
    >
      <Plus className="h-4 w-4" />
      Charakter erstellen
    </button>
  );
}

