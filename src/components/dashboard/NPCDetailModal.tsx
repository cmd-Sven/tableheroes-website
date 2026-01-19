"use client";

import { useState, useEffect } from "react";
import { X, User, Shield, Loader2 } from "lucide-react";
import { getNPCById } from "@/src/app/dashboard/campaigns/[id]/npc-actions";

type NPC = {
  id: string;
  name: string;
  role: string | null;
  race: string | null;
  status: string | null;
  description: string | null;
  appearance: string | null;
  personality_traits: string | null;
  gm_notes: string | null;
  factions?: {
    id: string;
    name: string;
    type: string;
  } | null;
};

type Props = {
  npc: NPC | null;
  isOpen: boolean;
  onClose: () => void;
  isGM?: boolean;
};

export function NPCDetailModal({ npc, isOpen, onClose, isGM = false }: Props) {
  const [fullNPC, setFullNPC] = useState<NPC | null>(npc);
  const [isLoading, setIsLoading] = useState(false);

  // Nachladen wenn Daten unvollständig sind
  useEffect(() => {
    if (!isOpen || !npc) {
      setFullNPC(null);
      return;
    }

    // Prüfe ob Daten fehlen
    const needsReload =
      !npc.description ||
      !npc.appearance ||
      !npc.personality_traits ||
      !npc.race ||
      !npc.status;

    if (needsReload && npc.id) {
      setIsLoading(true);
      getNPCById(npc.id)
        .then((data) => {
          setFullNPC(data as NPC);
        })
        .catch((error) => {
          console.error("Error loading NPC:", error);
          // Fallback: Nutze die vorhandenen Daten
          setFullNPC(npc);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setFullNPC(npc);
    }
  }, [isOpen, npc]);

  if (!isOpen || !fullNPC) return null;

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
            <User className="h-5 w-5 text-accent-gold" />
            <h2 className="font-cinzel font-bold text-2xl text-white">{fullNPC.name}</h2>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-accent-gold" />}
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
          {/* Basic Info */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {fullNPC.status && (
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-barlow font-bold uppercase border ${getStatusBadgeColor(
                    fullNPC.status
                  )}`}
                >
                  <span>{getStatusEmoji(fullNPC.status)}</span>
                  {fullNPC.status}
                </span>
              )}
              {fullNPC.race && (
                <span className="px-3 py-1 rounded text-xs font-barlow font-bold uppercase border border-hero-border bg-hero-dark/50 text-hero-vibrant">
                  {fullNPC.race}
                </span>
              )}
              {fullNPC.role && (
                <span className="px-3 py-1 rounded text-xs font-barlow font-bold uppercase border border-hero-border bg-hero-dark/50 text-hero-vibrant italic">
                  {fullNPC.role}
                </span>
              )}
            </div>

            {/* Faction */}
            {fullNPC.factions && (
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-accent-gold" />
                <span className="font-libre text-gray-300">
                  Mitglied der{" "}
                  <span className="text-accent-gold font-semibold">{fullNPC.factions.name}</span>
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {fullNPC.description ? (
            <div className="space-y-2">
              <h3 className="font-barlow font-semibold text-lg text-accent-gold uppercase">
                Beschreibung
              </h3>
              <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                {fullNPC.description}
              </p>
            </div>
          ) : (
            <p className="font-libre text-gray-500 italic">Keine Beschreibung verfügbar.</p>
          )}

          {/* Appearance */}
          {fullNPC.appearance && (
            <div className="space-y-2 border-t border-hero-dark pt-4">
              <h3 className="font-barlow font-semibold text-lg text-accent-gold uppercase">
                Aussehen
              </h3>
              <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                {fullNPC.appearance}
              </p>
            </div>
          )}

          {/* Personality */}
          {fullNPC.personality_traits && (
            <div className="space-y-2 border-t border-hero-dark pt-4">
              <h3 className="font-barlow font-semibold text-lg text-accent-gold uppercase">
                Persönlichkeit
              </h3>
              <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                {fullNPC.personality_traits}
              </p>
            </div>
          )}

          {/* GM Notes */}
          {isGM && fullNPC.gm_notes && (
            <div className="space-y-2 border-t border-hero-dark pt-4">
              <h3 className="font-barlow font-semibold text-lg text-accent-gold uppercase">
                🔒 GM-Notizen
              </h3>
              <p className="font-libre text-gray-300 leading-relaxed whitespace-pre-wrap bg-black/20 p-3 rounded border border-hero-border/10">
                {fullNPC.gm_notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


