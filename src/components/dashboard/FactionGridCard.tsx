"use client";

import { Info, Shield, Trash2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

type Faction = {
  id: string;
  name: string;
  type: string;
  current_status: string | null;
  description: string | null;
  member_count?: number;
  is_revealed?: boolean;
};

type Props = {
  faction: Faction;
  worldId?: string;
  campaignId?: string;
  isGM?: boolean;
  onDelete?: (faction: Faction) => void;
  onToggleVisibility?: (faction: Faction) => void;
  onInfoClick?: (faction: Faction) => void;
  /** Spieler: eigener Ruf bei dieser Fraktion (nur Anzeige) */
  playerReputation?: number;
};

function getReputationColor(reputation: number): string {
  if (reputation > 0) return "text-hero-vibrant";
  if (reputation < 0) return "text-accent-blood";
  return "text-gray-400";
}

export function FactionGridCard({ faction, worldId, campaignId, isGM, onDelete, onToggleVisibility, onInfoClick, playerReputation }: Props) {
  const detailHref = campaignId
    ? `/dashboard/campaigns/${campaignId}/factions/${faction.id}`
    : worldId
      ? `/dashboard/worlds/${worldId}/factions/${faction.id}`
      : "#";

  const handleCardClick = () => {
    if (onInfoClick) {
      onInfoClick(faction);
    } else {
      window.location.href = detailHref;
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`„${faction.name}" wirklich löschen?`)) {
      onDelete(faction);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
      className="group relative h-full flex flex-col rounded-lg border-2 border-transparent overflow-hidden transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-[#C5A572] hover:shadow-xl cursor-pointer"
      style={{
        backgroundImage: "url('/images/grunge-paper-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {(onDelete || (isGM && campaignId && onToggleVisibility)) && (
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
          {isGM && campaignId && onToggleVisibility && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(faction);
              }}
              className="p-1.5 rounded bg-white/90 backdrop-blur-sm text-zinc-700 hover:text-emerald-700 hover:bg-emerald-900/10 transition-colors shadow-md"
              title={faction.is_revealed ? "Für Spieler verbergen" : "Für Spieler sichtbar"}
            >
              {faction.is_revealed ? (
                <Eye className="h-4 w-4 text-emerald-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded bg-white/90 backdrop-blur-sm text-zinc-700 hover:text-red-700 hover:bg-red-900/10 transition-colors shadow-md"
              title="Löschen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex-none p-4 border-b border-gray-400/30 relative z-10">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Shield className="h-5 w-5 text-gray-700 shrink-0" />
            <h3 className="font-cinzel font-bold text-lg text-gray-900 line-clamp-2">
              {faction.name}
            </h3>
          </div>
        </div>
        {faction.type && (
          <p className="font-barlow text-sm text-gray-600 italic mb-1">{faction.type}</p>
        )}
        {faction.member_count != null && (
          <p className="font-libre text-xs text-gray-600">
            {faction.member_count} {faction.member_count === 1 ? "Mitglied" : "Mitglieder"}
          </p>
        )}
        {playerReputation != null && (
          <p className={`font-barlow font-bold text-sm mt-1 ${getReputationColor(playerReputation)}`}>
            Dein Ruf: {playerReputation > 0 ? "+" : ""}{playerReputation}
          </p>
        )}
      </div>

      <div className="flex-1 flex flex-col p-4 relative z-10">
        {faction.description ? (
          <p className="font-libre text-sm text-gray-700 leading-relaxed line-clamp-3 mb-3">
            {faction.description}
          </p>
        ) : (
          <p className="font-libre text-sm text-gray-600 italic mb-3 flex-1">
            Keine Beschreibung.
          </p>
        )}

        <Link
          href={detailHref}
          onClick={(e) => e.stopPropagation()}
          className="mt-auto w-full flex items-center justify-center gap-2 rounded border-2 border-gray-700 bg-gray-800/80 px-3 py-2 font-barlow font-bold text-xs uppercase text-gray-100 hover:bg-[#C5A572] hover:border-[#C5A572] transition-colors"
        >
          <Info className="h-4 w-4" />
          Details
        </Link>
      </div>
    </motion.div>
  );
}
