"use client";

import { useState, useTransition } from "react";
import { Book, Eye, EyeOff, Edit2, Trash2, AlertCircle, ChevronRight } from "lucide-react";
import { deleteLoreEntry, toggleLoreReveal } from "@/src/app/dashboard/campaigns/[id]/lore-actions";

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  image_url: string | null;
  description: string | null;
  gm_notes: string | null;
  is_revealed: boolean;
  children?: LoreEntry[];
};

type Props = {
  lore: LoreEntry;
  campaignId?: string;
  isGM: boolean;
  onEdit: (lore: LoreEntry) => void;
  depth?: number;
};

export function LoreCard({ lore, campaignId, isGM, onEdit, depth = 0 }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showGMNotes, setShowGMNotes] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasChildren = lore.children && lore.children.length > 0;

  const handleToggleReveal = () => {
    if (!campaignId) return;
    startTransition(async () => {
      try {
        await toggleLoreReveal(campaignId, lore.id, lore.is_revealed);
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Lore-Eintrag "${lore.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      try {
        await deleteLoreEntry(lore.id);
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  // Type Badge Color
  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      Location: "bg-green-900/50 text-green-300 border-green-700",
      History: "bg-amber-900/50 text-amber-300 border-amber-700",
      Religion: "bg-purple-900/50 text-purple-300 border-purple-700",
      Culture: "bg-blue-900/50 text-blue-300 border-blue-700",
      Magic: "bg-pink-900/50 text-pink-300 border-pink-700",
      Organization: "bg-gray-900/50 text-gray-300 border-gray-700",
      Event: "bg-red-900/50 text-red-300 border-red-700",
      Other: "bg-slate-800/50 text-slate-300 border-slate-600",
    };
    return colors[type] || colors["Other"];
  };

  return (
    <div className="ml-0">
      <article
        className={`gothic-dashboard-card p-4 transition-all mb-4 ${
          lore.is_revealed ? "ring-1 ring-hero-vibrant/60" : ""
        }`}
        style={{ marginLeft: depth * 16 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 flex items-start gap-2">
            {/* Expand Toggle (if has children) */}
            {hasChildren && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 flex-shrink-0"
              >
                <ChevronRight
                  className={`h-4 w-4 text-gray-400 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Book className="h-4 w-4 text-accent-gold flex-shrink-0 drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]" />
                <h3 className="font-cinzel font-bold text-lg text-accent-gold truncate drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]">
                  {lore.name}
                </h3>
              </div>

              {/* Type Badge */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-barlow font-bold uppercase border ${getTypeBadgeColor(
                    lore.type
                  )}`}
                >
                  {lore.type}
                </span>

                {hasChildren && (
                  <span className="text-xs font-barlow text-gray-500">
                    {lore.children!.length} {lore.children!.length === 1 ? "Unterelement" : "Unterelemente"}
                  </span>
                )}
              </div>

              {/* Description */}
              {lore.description && (
                <p className="font-libre text-sm text-emerald-50 leading-relaxed line-clamp-2 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]">
                  {lore.description}
                </p>
              )}
            </div>
          </div>

          {/* GM Actions */}
          {isGM && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleToggleReveal}
                disabled={isPending}
                className="rounded p-1.5 transition-colors hover:bg-hero-dark disabled:opacity-50"
                title={lore.is_revealed ? "Für Spieler verbergen" : "Für Spieler sichtbar"}
              >
                {lore.is_revealed ? (
                  <Eye className="h-4 w-4 text-hero-vibrant" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                )}
              </button>
              <button
                onClick={() => onEdit(lore)}
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

        {/* GM Notes (Only for GM) */}
        {isGM && lore.gm_notes && (
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
                {lore.gm_notes}
              </p>
            )}
          </div>
        )}

        {/* Visibility Indicator */}
        {!lore.is_revealed && isGM && (
          <div className="mt-3 flex items-center gap-2 rounded bg-slate-900/50 px-3 py-2 border border-slate-700/50">
            <EyeOff className="h-3 w-3 text-gray-500" />
            <span className="text-xs font-barlow text-gray-500">
              Nur für den GM sichtbar
            </span>
          </div>
        )}
      </article>

      {/* Render Children (if expanded) */}
      {hasChildren && isExpanded && (
        <div className="ml-6 border-l-2 border-hero-border/20 pl-2">
          {lore.children!.map((child) => (
            <LoreCard
              key={child.id}
              lore={child}
              campaignId={campaignId}
              isGM={isGM}
              onEdit={onEdit}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}





