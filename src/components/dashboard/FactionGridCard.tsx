"use client";

import { Info, Shield, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

type Faction = {
  id: string;
  name: string;
  type: string;
  current_status: string | null;
  description: string | null;
  is_revealed: boolean;
  member_count?: number;
  campaign_id?: string;
};

type Props = {
  faction: Faction;
  campaignId?: string;
  onInfoClick: (faction: Faction) => void;
  isGM?: boolean;
  onEdit?: (faction: Faction) => void;
  onDelete?: (faction: Faction) => void;
  onToggleVisibility?: (faction: Faction) => void;
};

export function FactionGridCard({ faction, campaignId, onInfoClick, isGM = false, onEdit, onDelete, onToggleVisibility }: Props) {
  // Status Badge Color
  const getStatusBadgeColor = (status: string | null) => {
    if (!status) return "bg-gray-800/50 text-gray-400 border-gray-700";
    const colors: Record<string, string> = {
      "Im Krieg": "bg-red-900/50 text-red-300 border-red-700",
      "Verbündet": "bg-green-900/50 text-green-300 border-green-700",
      "Neutral": "bg-gray-900/50 text-gray-300 border-gray-700",
      "Feindlich": "bg-orange-900/50 text-orange-300 border-orange-700",
      "Freundlich": "bg-blue-900/50 text-blue-300 border-blue-700",
    };
    return colors[status] || "bg-gray-800/50 text-gray-400 border-gray-700";
  };

  // Type Badge Color
  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      Gilde: "bg-blue-900/50 text-blue-300 border-blue-700",
      Fraktion: "bg-purple-900/50 text-purple-300 border-purple-700",
      Orden: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
      Kult: "bg-red-900/50 text-red-300 border-red-700",
      Königreich: "bg-green-900/50 text-green-300 border-green-700",
      Organisation: "bg-gray-900/50 text-gray-300 border-gray-700",
      Religion: "bg-indigo-900/50 text-indigo-300 border-indigo-700",
      Politik: "bg-amber-900/50 text-amber-300 border-amber-700",
      Militär: "bg-slate-900/50 text-slate-300 border-slate-700",
    };
    return colors[type] || "bg-slate-800/50 text-slate-300 border-slate-600";
  };

  const handleDelete = () => {
    if (onDelete && confirm(`Möchtest du "${faction.name}" wirklich löschen?`)) {
      onDelete(faction);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group relative h-full flex flex-col rounded-lg border-2 border-transparent overflow-hidden transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-[#C5A572] hover:shadow-xl ${
        !faction.is_revealed && isGM ? "opacity-75 grayscale" : ""
      }`}
      style={{
        backgroundImage: "url('/images/grunge-paper-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* GM Action Bar */}
      {isGM && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-30 bg-white/90 backdrop-blur-sm rounded-md p-1 shadow-md">
          {campaignId && (
            <Link
              href={`/dashboard/campaigns/${campaignId}/factions/${faction.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded text-zinc-700 hover:text-blue-700 hover:bg-zinc-900/10 transition-colors"
              title="Bearbeiten"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          )}
          {onToggleVisibility && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(faction);
              }}
              className={`p-1.5 rounded transition-colors ${
                faction.is_revealed
                  ? "text-zinc-700 hover:text-amber-700 hover:bg-zinc-900/10"
                  : "text-zinc-500 hover:text-amber-700 hover:bg-zinc-900/10"
              }`}
              title={faction.is_revealed ? "Für Spieler sichtbar" : "Verborgen"}
            >
              {faction.is_revealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-400/30 relative z-10">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Shield className="h-5 w-5 text-gray-700 flex-shrink-0" />
            <h3 className="font-cinzel font-bold text-lg text-gray-900 line-clamp-2">
              {faction.name}
            </h3>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Badge */}
          <span className="px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase border-2 border-gray-600 bg-gray-100/80 text-gray-800">
            {faction.type}
          </span>

          {/* Status Badge (farbcodiert) */}
          {faction.current_status && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase border-2 ${
                faction.current_status === "Im Krieg"
                  ? "bg-red-100/90 text-red-800 border-red-600"
                  : faction.current_status === "Feindlich"
                  ? "bg-orange-100/90 text-orange-800 border-orange-600"
                  : faction.current_status === "Verbündet"
                  ? "bg-green-100/90 text-green-800 border-green-600"
                  : faction.current_status === "Freundlich"
                  ? "bg-blue-100/90 text-blue-800 border-blue-600"
                  : "bg-gray-100/90 text-gray-800 border-gray-600"
              }`}
            >
              {faction.current_status}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-4 relative z-10">
        {/* Description Preview */}
        {faction.description ? (
          <p className="font-libre text-sm text-gray-700 leading-relaxed line-clamp-3 mb-3">
            {faction.description}
          </p>
        ) : (
          <p className="font-libre text-sm text-gray-600 italic mb-3">
            Keine Beschreibung verfügbar.
          </p>
        )}

        {/* Member Count */}
        {faction.member_count !== undefined && (
          <div className="mt-auto pt-2 border-t border-gray-400/30">
            <p className="text-xs font-barlow text-gray-700">
              {faction.member_count} {faction.member_count === 1 ? "Mitglied" : "Mitglieder"}
            </p>
          </div>
        )}

        {/* Info Button / Link */}
        {campaignId ? (
          <Link
            href={`/dashboard/campaigns/${campaignId}/factions/${faction.id}`}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded border-2 border-gray-700 bg-gray-800/80 px-3 py-2 font-barlow font-bold text-xs uppercase text-gray-100 hover:bg-[#C5A572] hover:border-[#C5A572] transition-colors"
          >
            <Info className="h-4 w-4" />
            Details
          </Link>
        ) : (
          <button
            onClick={() => onInfoClick(faction)}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded border-2 border-gray-700 bg-gray-800/80 px-3 py-2 font-barlow font-bold text-xs uppercase text-gray-100 hover:bg-[#C5A572] hover:border-[#C5A572] transition-colors"
          >
            <Info className="h-4 w-4" />
            Details
          </button>
        )}
      </div>

      {/* Revealed Indicator (only if not GM or if GM and revealed) */}
      {faction.is_revealed && !isGM && (
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-600 border-2 border-gray-800 shadow-lg z-20" />
      )}
    </motion.div>
  );
}

