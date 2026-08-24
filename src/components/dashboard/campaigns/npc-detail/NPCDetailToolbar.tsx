/**
 * Top toolbar: back link, full form, favorite, visibility, Discord, delete.
 */
"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2, Send, SlidersHorizontal, Star, X } from "lucide-react";
import { PublicSeoPanel } from "@/src/components/public/PublicSeoPanel";
import type { NPCDetailController } from "./useNPCDetailPage";

export function NPCDetailToolbar({ c }: { c: NPCDetailController }) {
  const {
    campaignId,
    npc,
    canEdit,
    isGM,
    isPending,
    isFavorite,
    isRevealed,
    discordSending,
    handleToggleFavorite,
    handleToggleVisibility,
    handleSendDiscord,
    handleDelete,
  } = c;

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/dashboard/campaigns/${campaignId}?tab=npcs`}
            className="flex items-center gap-2 text-hero-vibrant hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-barlow font-bold uppercase">Zurück</span>
          </Link>
          {canEdit ? (
            <Link
              href={`/dashboard/campaigns/${campaignId}/npcs/${npc.id}/edit`}
              className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
              title="Händler, Shop-Template, Hooks und weitere Felder (volles NPC-Formular)"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              Volles Formular
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFavorite}
            disabled={isPending}
            className={`p-2 rounded transition-colors ${
              isFavorite
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-gray-500 hover:text-yellow-500"
            } disabled:opacity-50`}
            title={
              isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"
            }
          >
            <Star className={`h-6 w-6 ${isFavorite ? "fill-current" : ""}`} />
          </button>
          {canEdit && (
            <>
              <button
                onClick={handleToggleVisibility}
                disabled={isPending}
                className={`p-2 rounded transition-colors ${
                  isRevealed
                    ? "text-green-500 hover:text-green-600 hover:bg-green-900/20"
                    : "text-gray-500 hover:text-gray-400 hover:bg-gray-900/20"
                } disabled:opacity-50`}
                title={isRevealed ? "Für Spieler sichtbar" : "Verborgen"}
              >
                {isRevealed ? (
                  <Eye className="h-6 w-6" />
                ) : (
                  <EyeOff className="h-6 w-6" />
                )}
              </button>
              {isRevealed ? (
                <button
                  onClick={handleSendDiscord}
                  disabled={discordSending || isPending}
                  className="p-2 rounded text-[#aeb4ff] hover:text-[#5865F2] hover:bg-[#5865F2]/15 transition-colors disabled:opacity-50"
                  title="An Discord senden"
                >
                  {discordSending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                </button>
              ) : null}
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="p-2 rounded transition-colors text-red-500 hover:text-red-600 hover:bg-red-900/20 disabled:opacity-50"
                title="Löschen"
              >
                <X className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      </div>

      {isGM ? (
        <PublicSeoPanel
          campaignId={campaignId}
          entityType="npc"
          entityId={npc.id}
          entityName={npc.name}
        />
      ) : null}
    </>
  );
}
