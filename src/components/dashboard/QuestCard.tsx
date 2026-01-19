"use client";

import { useState, useTransition } from "react";
import { ScrollText, Eye, EyeOff, Edit2, Trash2, AlertCircle, CheckCircle2, User, MapPin } from "lucide-react";
import Link from "next/link";
import { deleteQuest, toggleQuestReveal, completeQuest } from "@/src/app/dashboard/campaigns/[id]/quest-actions";

type Quest = {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  rewards: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
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
};

type Props = {
  quest: Quest;
  campaignId: string;
  isGM: boolean;
};

export function QuestCard({ quest, campaignId, isGM }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showGMNotes, setShowGMNotes] = useState(false);

  const handleToggleReveal = () => {
    startTransition(async () => {
      try {
        await toggleQuestReveal(quest.id, quest.is_revealed);
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Quest "${quest.title}" wirklich löschen?`)) return;
    startTransition(async () => {
      try {
        await deleteQuest(quest.id);
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  const handleComplete = () => {
    if (!confirm(`Quest "${quest.title}" als abgeschlossen markieren?`)) return;
    startTransition(async () => {
      try {
        await completeQuest(quest.id);
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  // Type Badge Color
  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      "Main Quest": "bg-purple-900/50 text-purple-300 border-purple-700",
      "Side Quest": "bg-blue-900/50 text-blue-300 border-blue-700",
      "Fetch Quest": "bg-green-900/50 text-green-300 border-green-700",
      "Kill Quest": "bg-red-900/50 text-red-300 border-red-700",
      "Escort Quest": "bg-yellow-900/50 text-yellow-300 border-yellow-700",
      "Mystery Quest": "bg-indigo-900/50 text-indigo-300 border-indigo-700",
      "Other": "bg-slate-800/50 text-slate-300 border-slate-600",
    };
    return colors[type] || colors["Other"];
  };

  // Status Badge Color
  const getStatusBadgeColor = (status: string) => {
    if (status === "Completed") {
      return "bg-green-900/50 text-green-300 border-green-700";
    }
    return "bg-blue-900/50 text-blue-300 border-blue-700";
  };

  const isCompleted = quest.status === "Completed";

  return (
    <article
      className={`rounded-lg border bg-gradient-to-br from-amber-950/20 to-background-card p-5 transition-all relative ${
        quest.is_revealed
          ? "border-hero-vibrant shadow-lg shadow-hero-vibrant/10"
          : "border-hero-dark"
      } ${isCompleted ? "opacity-75" : ""} cursor-pointer hover:border-hero-vibrant`}
    >
      {/* Clickable Link Wrapper */}
      <Link
        href={`/dashboard/campaigns/${campaignId}/quests/${quest.id}`}
        className="absolute inset-0 z-10"
        aria-label={`${quest.title} Details öffnen`}
      />
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <ScrollText className="h-5 w-5 text-accent-gold flex-shrink-0" />
            {/* Character Avatar for Personal Quests */}
            {(quest as any).assigned_character && (
              <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-hero-border bg-hero-dark">
                {(quest as any).assigned_character.avatar_url ? (
                  <img
                    src={(quest as any).assigned_character.avatar_url}
                    alt={(quest as any).assigned_character.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-hero-dark text-white font-bold text-xs">
                    {(quest as any).assigned_character.name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-cinzel font-bold text-xl text-white truncate">
                {quest.title}
              </h3>
              {(quest as any).assigned_character && (
                <p className="text-xs font-libre text-gray-400 mt-0.5">
                  Persönliche Quest für {(quest as any).assigned_character.name}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase border ${getTypeBadgeColor(
                quest.type
              )}`}
            >
              {quest.type}
            </span>

            <span
              className={`px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase border ${getStatusBadgeColor(
                quest.status
              )}`}
            >
              {isCompleted ? "✓ Abgeschlossen" : "Aktiv"}
            </span>
          </div>

          {/* Linked NPC & Location */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-libre text-gray-400 mb-3">
            {quest.quest_giver && (
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-accent-gold/60" />
                <span>
                  Quest-Geber:{" "}
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/npcs/${quest.quest_giver.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-accent-gold font-semibold hover:underline cursor-pointer transition-colors"
                  >
                    {quest.quest_giver.name}
                    {quest.quest_giver.title && ` (${quest.quest_giver.title})`}
                  </Link>
                </span>
              </div>
            )}

            {quest.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-accent-gold/60" />
                <span>
                  Ort:{" "}
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/lore/${quest.location.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-accent-gold font-semibold hover:underline cursor-pointer transition-colors"
                  >
                    {quest.location.name}
                  </Link>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* GM Actions */}
        {isGM && (
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {!isCompleted && (
              <button
                onClick={handleComplete}
                disabled={isPending}
                className="rounded p-1.5 transition-colors hover:bg-hero-dark disabled:opacity-50"
                title="Quest abschließen"
              >
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </button>
            )}
            <button
              onClick={handleToggleReveal}
              disabled={isPending}
              className="rounded p-1.5 transition-colors hover:bg-hero-dark disabled:opacity-50"
              title={quest.is_revealed ? "Für Spieler verbergen" : "Für Spieler sichtbar"}
            >
              {quest.is_revealed ? (
                <Eye className="h-4 w-4 text-hero-vibrant" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <Link
              href={`/dashboard/campaigns/${campaignId}/quests/${quest.id}/edit`}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="rounded p-1.5 transition-colors hover:bg-hero-dark"
              title="Bearbeiten"
            >
              <Edit2 className="h-4 w-4 text-blue-400" />
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isPending}
              className="rounded p-1.5 transition-colors hover:bg-hero-dark disabled:opacity-50"
              title="Löschen"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {quest.description && (
        <div className="mb-3">
          <p className="font-libre text-sm text-gray-300 leading-relaxed">
            {quest.description}
          </p>
        </div>
      )}

      {/* Rewards */}
      {quest.rewards && (
        <div className="mb-3 rounded bg-yellow-900/20 border border-yellow-700/30 px-3 py-2">
          <p className="font-barlow font-bold text-xs uppercase text-accent-gold mb-1">
            Belohnungen
          </p>
          <p className="font-libre text-sm text-gray-300">
            {quest.rewards}
          </p>
        </div>
      )}

      {/* GM Notes (Only for GM) */}
      {isGM && quest.gm_notes && (
        <div className="mt-3 border-t border-hero-border/20 pt-3">
          <button
            onClick={() => setShowGMNotes(!showGMNotes)}
            className="flex items-center gap-2 text-xs font-barlow font-bold uppercase text-accent-gold hover:text-accent-gold/80 transition-colors mb-2"
          >
            <AlertCircle className="h-3 w-3" />
            GM-Notizen {showGMNotes ? "verbergen" : "anzeigen"}
          </button>
          {showGMNotes && (
            <p className="font-libre text-xs text-gray-400 leading-relaxed bg-black/20 p-3 rounded border border-hero-border/10">
              {quest.gm_notes}
            </p>
          )}
        </div>
      )}

      {/* Visibility Indicator */}
      {!quest.is_revealed && isGM && (
        <div className="mt-3 flex items-center gap-2 rounded bg-slate-900/50 px-3 py-2 border border-slate-700/50">
          <EyeOff className="h-3 w-3 text-gray-500" />
          <span className="text-xs font-barlow text-gray-500">
            Nur für den GM sichtbar
          </span>
        </div>
      )}
    </article>
  );
}



