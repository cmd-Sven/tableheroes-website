/**
 * LiveSessionQuestOverlay — Player-toggleable active quest journal panel for the live session.
 */
"use client";

import { BookOpen, X } from "lucide-react";
import type { ActiveQuest } from "@/src/components/session/live-board/live-session-types";

type Props = {
  open: boolean;
  quests: ActiveQuest[];
  onClose: () => void;
};

export function LiveSessionQuestOverlay({ open, quests, onClose }: Props) {
  if (!open || quests.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex justify-end">
      <div className="pointer-events-auto mt-[64px] mb-4 mr-4 w-full max-w-md rounded-xl bg-black/80 backdrop-blur-md border border-hero-dark shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-hero-dark">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent-gold" />
            <h2 className="font-barlow font-bold text-sm uppercase text-gray-200">
              Aktive Aufgaben
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-white hover:bg-background-dark transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {quests.map((quest) => (
            <div
              key={quest.id}
              className="rounded border border-hero-border/40 bg-background-dark/80 p-3"
            >
              <h3 className="font-cinzel font-bold text-sm text-accent-gold mb-1">
                {quest.title}
              </h3>
              <div className="space-y-1 mb-2">
                {quest.quest_giver?.name && (
                  <p className="font-libre text-[11px] text-gray-300">
                    <span className="font-barlow font-bold uppercase text-[10px] text-gray-400">
                      Auftraggeber:
                    </span>{" "}
                    {quest.quest_giver.name}
                  </p>
                )}
                {quest.location?.name && (
                  <p className="font-libre text-[11px] text-gray-300">
                    <span className="font-barlow font-bold uppercase text-[10px] text-gray-400">
                      Ort:
                    </span>{" "}
                    {quest.location.name}
                  </p>
                )}
                {quest.type && (
                  <p className="font-libre text-[11px] text-gray-400">
                    <span className="font-barlow font-bold uppercase text-[10px] text-gray-500">
                      Typ:
                    </span>{" "}
                    {quest.type}
                  </p>
                )}
              </div>
              {quest.description && (
                <div className="max-h-24 overflow-y-auto mb-2">
                  <p className="font-libre text-xs text-gray-200 whitespace-pre-wrap">
                    {quest.description}
                  </p>
                </div>
              )}
              {quest.rewards && (
                <div className="rounded border border-hero-border/40 bg-hero-dark/40 px-2 py-1">
                  <p className="font-barlow font-bold text-[10px] uppercase text-accent-gold mb-0.5">
                    Belohnung
                  </p>
                  <p className="font-libre text-[11px] text-gray-200">
                    {quest.rewards}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
