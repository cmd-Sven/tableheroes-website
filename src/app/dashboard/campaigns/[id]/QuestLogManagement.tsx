"use client";

import { useState } from "react";
import { Plus, ScrollText } from "lucide-react";
import { QuestCard } from "@/src/components/dashboard/QuestCard";
import Link from "next/link";

type Quest = {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  rewards: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
  assigned_character_id?: string | null;
  quest_giver?: {
    id: string;
    name: string;
    title: string | null;
  } | null;
  location?: {
    id: string;
    name: string;
    type: string;
  } | null;
  assigned_character?: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    avatar_url: string | null;
  } | null;
};

type NPC = {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
};

type Location = {
  id: string;
  name: string;
  type: string;
};

type Character = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
};

type Member = {
  id: string;
  character_id: string | null;
  user?: {
    username: string;
  } | null;
  character_data?: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    status: string;
  } | null;
  characters?: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    status: string;
  } | null;
};

type Props = {
  campaignId: string;
  quests: Quest[];
  npcs: NPC[];
  locations: Location[];
  characters?: Character[];
  members?: Member[];
  isGM: boolean;
};

export function QuestLogManagement({ campaignId, quests, npcs, locations, characters = [], members = [], isGM }: Props) {

  // Separate Active and Completed Quests
  const activeQuests = quests.filter((q) => q.status !== "Completed");
  const completedQuests = quests.filter((q) => q.status === "Completed");

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-hero-dark">
        <h2 className="font-barlow font-bold text-xl text-white uppercase flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-accent-gold" />
          Journal / Quests ({quests.length})
        </h2>
        {isGM && (
          <Link
            href={`/dashboard/campaigns/${campaignId}/quests/new`}
            className="flex items-center gap-2 rounded bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neue Quest
          </Link>
        )}
      </div>

      {/* Info Box (GM Only) */}
      {isGM && (
        <div className="mb-6 rounded border border-blue-700/30 bg-blue-900/20 p-4">
          <p className="font-libre text-sm text-blue-300 leading-relaxed">
            <strong className="font-bold">Quest-Management:</strong> Erstelle Quests für deine Kampagne. 
            Verknüpfe sie mit NPCs und Orten, um Kontext zu schaffen. Nutze die KI, um kreative Quest-Ideen zu generieren.
          </p>
        </div>
      )}

      {/* Active Quests */}
      <div className="mb-8">
        <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-400"></div>
          Aktive Quests ({activeQuests.length})
        </h3>

        {activeQuests.length === 0 ? (
          <div className="text-center py-8 rounded border border-hero-border/20 bg-background-dark">
            <ScrollText className="h-10 w-10 text-gray-600 mx-auto mb-2" />
            <p className="font-libre text-sm text-gray-400">
              {isGM ? "Noch keine aktiven Quests." : "Keine aktiven Quests verfügbar."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                campaignId={campaignId}
                isGM={isGM}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Quests */}
      <div>
        <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-400"></div>
          Abgeschlossene Quests ({completedQuests.length})
        </h3>

        {completedQuests.length === 0 ? (
          <div className="text-center py-8 rounded border border-hero-border/20 bg-background-dark">
            <p className="font-libre text-sm text-gray-400">
              Noch keine abgeschlossenen Quests.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {completedQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                campaignId={campaignId}
                isGM={isGM}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



