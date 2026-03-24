"use client";

import { X, Shield, Users } from "lucide-react";

type Faction = {
  id: string;
  name: string;
  type: string;
  current_status: string | null;
  description: string | null;
  gm_notes: string | null;
};

type NPC = {
  id: string;
  name: string;
  role: string | null;
  race: string | null;
  avatar_url: string | null;
};

type Props = {
  faction: Faction | null;
  members: NPC[];
  isOpen: boolean;
  onClose: () => void;
  isGM?: boolean;
};

export function FactionDetailModal({ faction, members, isOpen, onClose, isGM = false }: Props) {
  if (!isOpen || !faction) return null;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-background-card border border-hero-border rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-dark">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-accent-gold" />
            <h2 className="font-cinzel font-bold text-2xl text-white">{faction.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 text-gray-400 hover:text-white hover:bg-hero-dark transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded text-xs font-barlow font-bold uppercase border ${getTypeBadgeColor(
                faction.type
              )}`}
            >
              {faction.type}
            </span>
            {faction.current_status && (
              <span
                className={`px-3 py-1 rounded text-xs font-barlow font-bold uppercase border ${getStatusBadgeColor(
                  faction.current_status
                )}`}
              >
                {faction.current_status}
              </span>
            )}
          </div>

          {/* Description */}
          {faction.description ? (
            <div className="space-y-2">
              <h3 className="font-barlow font-semibold text-lg text-accent-gold uppercase">
                Beschreibung
              </h3>
              <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                {faction.description}
              </p>
            </div>
          ) : (
            <p className="font-libre text-gray-500 italic">Keine Beschreibung verfügbar.</p>
          )}

          {/* GM Notes */}
          {isGM && faction.gm_notes && (
            <div className="space-y-2 border-t border-hero-dark pt-4">
              <h3 className="font-barlow font-semibold text-lg text-accent-gold uppercase">
                🔒 GM-Notizen
              </h3>
              <p className="font-libre text-gray-300 leading-relaxed whitespace-pre-wrap bg-black/20 p-3 rounded border border-hero-border/10">
                {faction.gm_notes}
              </p>
            </div>
          )}

          {/* Members Section */}
          <div className="space-y-3 border-t border-hero-dark pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent-gold" />
              <h3 className="font-barlow font-semibold text-lg text-accent-gold uppercase">
                Mitglieder ({members.length})
              </h3>
            </div>
            {members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded border border-hero-dark bg-background-dark p-3 hover:bg-background-dark transition-colors"
                  >
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.name}
                        className="h-10 w-10 rounded-full object-cover border border-hero-border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-hero-dark border border-hero-border flex items-center justify-center text-white font-bold">
                        {member.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-cinzel font-bold text-white">{member.name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {member.role && <span>{member.role}</span>}
                        {member.race && (
                          <>
                            {member.role && <span>•</span>}
                            <span>{member.race}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-libre text-sm text-gray-500 italic">
                Diese Fraktion hat noch keine Mitglieder.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




