"use client";

import { useState, useTransition } from "react";
import { Shield, Users, Eye, EyeOff, Edit2, Trash2, AlertCircle } from "lucide-react";
import { deleteFaction, toggleFactionReveal } from "@/src/app/dashboard/campaigns/[id]/factions-actions";

type Faction = {
  id: string;
  name: string;
  type: string;
  current_status: string | null;
  description: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
  member_count: number;
};

type Props = {
  faction: Faction;
  campaignId: string;
  isGM: boolean;
  onEdit: (faction: Faction) => void;
};

export function FactionCard({ faction, campaignId, isGM, onEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showGMNotes, setShowGMNotes] = useState(false);

  const handleToggleReveal = () => {
    startTransition(async () => {
      try {
        await toggleFactionReveal(campaignId, faction.id, faction.is_revealed);
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Fraktion "${faction.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      try {
        await deleteFaction(faction.id);
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  // Faction Type Badge Color
  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      Gilde: "bg-blue-900/50 text-blue-300 border-blue-700",
      Fraktion: "bg-purple-900/50 text-purple-300 border-purple-700",
      Orden: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
      Kult: "bg-red-900/50 text-red-300 border-red-700",
      Königreich: "bg-green-900/50 text-green-300 border-green-700",
      Organisation: "bg-gray-900/50 text-gray-300 border-gray-700",
      Andere: "bg-slate-800/50 text-slate-300 border-slate-600",
    };
    return colors[type] || colors["Andere"];
  };

  // Status Badge Color
  const getStatusBadgeColor = (status: string | null) => {
    if (!status) return "bg-gray-800 text-gray-400 border-gray-700";
    const colors: Record<string, string> = {
      "Im Krieg": "bg-red-900/50 text-red-300 border-red-700",
      "Verbündet": "bg-green-900/50 text-green-300 border-green-700",
      "Neutral": "bg-gray-900/50 text-gray-300 border-gray-700",
      "Feindlich": "bg-orange-900/50 text-orange-300 border-orange-700",
      "Freundlich": "bg-blue-900/50 text-blue-300 border-blue-700",
    };
    return colors[status] || "bg-gray-800 text-gray-400 border-gray-700";
  };

  return (
    <article className={`gothic-dashboard-card p-6 transition-all ${faction.is_revealed ? "ring-1 ring-hero-vibrant/60" : ""}`}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-accent-gold flex-shrink-0 drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]" />
            <h3 className="font-cinzel font-bold text-xl text-accent-gold truncate drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]">
              {faction.name}
            </h3>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase border ${getTypeBadgeColor(
                faction.type
              )}`}
            >
              {faction.type}
            </span>

            {faction.current_status && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase border ${getStatusBadgeColor(
                  faction.current_status
                )}`}
              >
                {faction.current_status}
              </span>
            )}

            {/* Member Count */}
            <div className="flex items-center gap-1 text-emerald-50 drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]">
              <Users className="h-3 w-3" />
              <span className="text-xs font-barlow font-bold">
                {faction.member_count} {faction.member_count === 1 ? "Mitglied" : "Mitglieder"}
              </span>
            </div>
          </div>
        </div>

        {/* GM Actions */}
        {isGM && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleToggleReveal}
              disabled={isPending}
              className="rounded p-1.5 transition-colors hover:bg-hero-dark disabled:opacity-50"
              title={faction.is_revealed ? "Für Spieler verbergen" : "Für Spieler sichtbar"}
            >
              {faction.is_revealed ? (
                <Eye className="h-4 w-4 text-hero-vibrant" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <button
              onClick={() => onEdit(faction)}
              disabled={isPending}
              className="rounded p-1.5 transition-colors hover:bg-hero-dark disabled:opacity-50"
              title="Bearbeiten"
            >
              <Edit2 className="h-4 w-4 text-blue-400" />
            </button>
            <button
              onClick={handleDelete}
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
      {faction.description && (
        <div className="mb-3">
          <p className="font-libre text-sm text-emerald-50 leading-relaxed drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]">
            {faction.description}
          </p>
        </div>
      )}

      {/* GM Notes (Only for GM) */}
      {isGM && faction.gm_notes && (
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
              {faction.gm_notes}
            </p>
          )}
        </div>
      )}

      {/* Visibility Indicator */}
      {!faction.is_revealed && isGM && (
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





