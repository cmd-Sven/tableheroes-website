"use client";

import { useState, useTransition } from "react";
import { User, Eye, EyeOff, Edit2, Trash2, AlertCircle, Shield } from "lucide-react";
import { deleteNPC, toggleNPCReveal } from "@/src/app/dashboard/campaigns/[id]/npc-actions";

type NPC = {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
  factions?: {
    id: string;
    name: string;
    type: string;
  } | null;
};

type Props = {
  npc: NPC;
  isGM: boolean;
  onEdit: (npc: NPC) => void;
};

export function NPCCard({ npc, isGM, onEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showGMNotes, setShowGMNotes] = useState(false);

  const handleToggleReveal = () => {
    startTransition(async () => {
      try {
        await toggleNPCReveal(npc.id, npc.is_revealed);
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`NPC "${npc.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      try {
        await deleteNPC(npc.id);
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  return (
    <article
      className={`rounded-lg border bg-background-card p-6 transition-all ${
        npc.is_revealed
          ? "border-hero-vibrant shadow-lg shadow-hero-vibrant/10"
          : "border-hero-dark"
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-5 w-5 text-accent-gold flex-shrink-0" />
            <h3 className="font-cinzel font-bold text-xl text-white truncate">
              {npc.name}
            </h3>
          </div>

          {/* Title/Role */}
          {npc.title && (
            <p className="font-barlow text-sm text-gray-400 uppercase tracking-wide mb-2">
              {npc.title}
            </p>
          )}

          {/* Faction Badge */}
          {npc.factions && (
            <div className="flex items-center gap-1.5 text-xs font-libre text-gray-400 mt-2">
              <Shield className="h-3 w-3 text-accent-gold/60" />
              <span>
                Mitglied der <span className="text-accent-gold font-semibold">{npc.factions.name}</span>
              </span>
            </div>
          )}
        </div>

        {/* GM Actions */}
        {isGM && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleToggleReveal}
              disabled={isPending}
              className="rounded p-1.5 transition-colors hover:bg-hero-dark disabled:opacity-50"
              title={npc.is_revealed ? "Für Spieler verbergen" : "Für Spieler sichtbar"}
            >
              {npc.is_revealed ? (
                <Eye className="h-4 w-4 text-hero-vibrant" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <button
              onClick={() => onEdit(npc)}
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
      {npc.description && (
        <div className="mb-3">
          <p className="font-libre text-sm text-gray-300 leading-relaxed">
            {npc.description}
          </p>
        </div>
      )}

      {/* GM Notes (Only for GM) */}
      {isGM && npc.gm_notes && (
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
              {npc.gm_notes}
            </p>
          )}
        </div>
      )}

      {/* Visibility Indicator */}
      {!npc.is_revealed && isGM && (
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

