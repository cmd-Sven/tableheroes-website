"use client";

import { Info, User, Shield, Trash2, Eye, EyeOff, Star, AlertCircle, ScrollText } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTransition } from "react";
import { toggleNPCFavorite } from "@/src/app/dashboard/campaigns/[id]/npc-actions";

type Quest = {
  id: string;
  title: string;
  status: string;
  type: string;
};

type NPC = {
  id: string;
  name: string;
  role: string | null;
  race: string | null;
  status: string | null;
  description: string | null;
  is_revealed: boolean;
  is_favorite?: boolean;
  has_active_quest?: boolean;
  has_active_quest_as_giver?: boolean;
  active_quests?: Quest[];
  active_quest_titles_as_giver?: string[];
  factions?: {
    id: string;
    name: string;
    type: string;
  } | null;
};

type Props = {
  npc: NPC;
  campaignId: string;
  isGM?: boolean;
  onDelete?: (npc: NPC) => void;
  onToggleVisibility?: (npc: NPC) => void;
};

export function NPCGridCard({ npc, campaignId, isGM = false, onDelete, onToggleVisibility }: Props) {
  const [isPending, startTransition] = useTransition();

  // Debug: Log Quest data (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log(`🔍 [NPCGridCard] NPC ${npc.name} Quest Data:`, {
      has_active_quest: npc.has_active_quest,
      active_quests: npc.active_quests,
      quests_as_giver: (npc as any).quests_as_giver,
      quests_as_participant: (npc as any).quests_as_participant,
      isGM,
    });
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      try {
        await toggleNPCFavorite(npc.id, npc.is_favorite || false);
      } catch (error: any) {
        alert(error.message || "Fehler beim Aktualisieren der Favoriten.");
      }
    });
  };

  const handleQuestClick = (e: React.MouseEvent, questId: string) => {
    e.stopPropagation();
    window.location.href = `/dashboard/campaigns/${campaignId}?tab=quests&questId=${questId}`;
  };

  const handleCardClick = () => {
    window.location.href = `/dashboard/campaigns/${campaignId}/npcs/${npc.id}`;
  };
  // Status Badge Color
  const getStatusBadgeColor = (status: string | null) => {
    if (!status) return "bg-gray-800/50 text-gray-400 border-gray-700";
    const colors: Record<string, string> = {
      Alive: "bg-green-900/50 text-green-300 border-green-700",
      Deceased: "bg-red-900/50 text-red-300 border-red-700",
      Missing: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
      Unknown: "bg-gray-900/50 text-gray-300 border-gray-700",
    };
    return colors[status] || "bg-gray-800/50 text-gray-400 border-gray-700";
  };

  const getStatusEmoji = (status: string | null) => {
    if (!status) return "⚪";
    const emojis: Record<string, string> = {
      Alive: "🟢",
      Deceased: "🔴",
      Missing: "🟡",
      Unknown: "⚪",
    };
    return emojis[status] || "⚪";
  };

  const handleDelete = () => {
    if (onDelete && confirm(`Möchtest du "${npc.name}" wirklich löschen?`)) {
      onDelete(npc);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
      className={`group relative h-full flex flex-col rounded-lg border-2 overflow-hidden transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl cursor-pointer ${
        npc.has_active_quest_as_giver
          ? "border-accent-gold/60 hover:border-accent-gold shadow-[0_0_20px_rgba(202,185,38,0.25)]"
          : npc.has_active_quest
            ? "border-green-500 hover:border-green-400"
            : "border-transparent hover:border-[#C5A572]"
      } ${!npc.is_revealed && isGM ? "opacity-75 grayscale" : ""}`}
      style={{
        backgroundImage: "url('/images/grunge-paper-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Favorite Star & Quest Icon */}
      <div className="absolute top-2 left-2 flex items-center gap-1 z-30">
        {/* Favorite Toggle */}
        <button
          onClick={handleToggleFavorite}
          disabled={isPending}
          className={`p-1.5 rounded transition-colors ${
            npc.is_favorite
              ? "text-yellow-500 hover:text-yellow-600 bg-yellow-100/80"
              : "text-gray-500 hover:text-yellow-500 bg-white/90"
          } disabled:opacity-50`}
          title={npc.is_favorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
        >
          <Star className={`h-4 w-4 ${npc.is_favorite ? "fill-current" : ""}`} />
        </button>

        {/* Active Quest Icon (Giver) – links neben Favoriten */}
        {npc.has_active_quest && npc.active_quests && npc.active_quests.length > 0 && !npc.has_active_quest_as_giver && (
          <Link
            href={`/dashboard/campaigns/${campaignId}?tab=quests&questId=${npc.active_quests[0].id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded bg-green-500/90 text-white hover:bg-green-600 transition-colors"
            title={`Aktive Quest: ${npc.active_quests[0].title}`}
          >
            <AlertCircle className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Oben rechts: Questgeber-Indikator (gold, Glow) + GM Action Bar */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-30">
        {npc.has_active_quest_as_giver && (
          <div
            className="flex items-center justify-center w-9 h-9 rounded-md bg-accent-gold/20 border border-accent-gold/50 text-accent-gold shadow-[0_0_12px_rgba(202,185,38,0.5)]"
            title={
              npc.active_quest_titles_as_giver && npc.active_quest_titles_as_giver.length > 0
                ? `Aktive Quest(s): ${npc.active_quest_titles_as_giver.join(", ")}`
                : "Vergibt aktive Quest(s)"
            }
          >
            <ScrollText className="h-5 w-5" aria-hidden />
          </div>
        )}
        {isGM && (
        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md p-1 shadow-md">
          {onToggleVisibility && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(npc);
              }}
              className={`p-1.5 rounded transition-colors ${
                npc.is_revealed
                  ? "text-zinc-700 hover:text-amber-700 hover:bg-zinc-900/10"
                  : "text-zinc-500 hover:text-amber-700 hover:bg-zinc-900/10"
              }`}
              title={npc.is_revealed ? "Für Spieler sichtbar" : "Verborgen"}
            >
              {npc.is_revealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-1.5 rounded text-zinc-700 hover:text-red-700 hover:bg-red-900/10 transition-colors"
              title="Löschen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        )}
      </div>
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-400/30 relative z-10">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <User className="h-5 w-5 text-gray-700 flex-shrink-0" />
            <h3 className="font-cinzel font-bold text-lg text-gray-900 line-clamp-2">
              {npc.name}
            </h3>
          </div>
        </div>

        {/* Status Badge */}
        {npc.status && (
          <div className="mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase border-2 ${
                npc.status === "Alive"
                  ? "bg-green-100/80 text-green-800 border-green-600"
                  : npc.status === "Deceased"
                  ? "bg-red-100/80 text-red-800 border-red-600"
                  : npc.status === "Missing"
                  ? "bg-yellow-100/80 text-yellow-800 border-yellow-600"
                  : "bg-gray-100/80 text-gray-800 border-gray-600"
              }`}
            >
              <span>{getStatusEmoji(npc.status)}</span>
              {npc.status}
            </span>
          </div>
        )}

        {/* Role & Race */}
        <div className="space-y-1">
          {npc.role && (
            <p className="font-barlow text-sm text-gray-700 italic">{npc.role}</p>
          )}
          {npc.race && (
            <p className="font-libre text-xs text-gray-600">{npc.race}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-4 relative z-10">
        {/* Faction Badge */}
        {npc.factions && (
          <div className="mb-3 flex items-center gap-1.5 text-xs">
            <Shield className="h-3 w-3 text-gray-700" />
            <span className="font-libre text-gray-700">
              <span className="text-gray-900 font-semibold">{npc.factions.name}</span>
            </span>
          </div>
        )}

        {/* Description Preview */}
        {npc.description ? (
          <p className="font-libre text-sm text-gray-700 leading-relaxed line-clamp-3 mb-3">
            {npc.description}
          </p>
        ) : (
          <p className="font-libre text-sm text-gray-600 italic mb-3 flex-1">
            Keine Beschreibung verfügbar.
          </p>
        )}

        {/* Details Link */}
        <Link
          href={`/dashboard/campaigns/${campaignId}/npcs/${npc.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-auto w-full flex items-center justify-center gap-2 rounded border-2 border-gray-700 bg-gray-800/80 px-3 py-2 font-barlow font-bold text-xs uppercase text-gray-100 hover:bg-[#C5A572] hover:border-[#C5A572] transition-colors"
        >
          <Info className="h-4 w-4" />
          Details
        </Link>
      </div>

      {/* Revealed Indicator (only if not GM or if GM and revealed) */}
      {npc.is_revealed && !isGM && (
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-600 border-2 border-gray-800 shadow-lg z-20" />
      )}
    </motion.div>
  );
}

