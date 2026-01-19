"use client";

import { X, CheckCircle, BookOpen, AlertTriangle, User } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  questTitle?: string;
  suggestedNPCs?: string[];
  suggestedLocations?: string[];
};

export function IntegrationReportModal({
  isOpen,
  onClose,
  characterName,
  questTitle,
  suggestedNPCs = [],
  suggestedLocations = [],
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-lg border border-hero-dark bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-hero-dark">
          <h2 className="font-barlow font-bold text-2xl uppercase text-hero-vibrant">
            Integration Report
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Success Message */}
          <div className="flex items-center gap-3 rounded border border-green-700/50 bg-green-950/20 p-4">
            <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
            <p className="font-barlow font-bold text-green-400">
              ✅ {characterName} ist nun Teil der Gruppe.
            </p>
          </div>

          {/* Quest Created */}
          {questTitle && (
            <div className="rounded border border-accent-gold/50 bg-accent-gold/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-accent-gold" />
                <h3 className="font-barlow font-bold text-sm text-accent-gold uppercase">
                  📜 Quest erstellt
                </h3>
              </div>
              <p className="font-libre text-white">{questTitle}</p>
              <p className="mt-2 font-libre text-xs text-gray-400">
                Diese Personal Quest wurde automatisch basierend auf der Charakter-Backstory erstellt.
              </p>
            </div>
          )}

          {/* Suggested NPCs */}
          {suggestedNPCs.length > 0 && (
            <div className="rounded border border-yellow-700/50 bg-yellow-950/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <h3 className="font-barlow font-bold text-sm text-yellow-400 uppercase">
                  ⚠️ Vorgeschlagene NPCs
                </h3>
              </div>
              <p className="font-libre text-sm text-gray-300 mb-3">
                Die KI hat diese neuen NPCs in der Backstory gefunden, die noch nicht existieren:
              </p>
              <ul className="space-y-2">
                {suggestedNPCs.map((npc, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 rounded bg-background-dark p-2 border border-hero-border/20"
                  >
                    <User className="h-4 w-4 text-accent-gold" />
                    <span className="font-libre text-white">{npc}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-libre text-xs text-gray-500">
                Du kannst diese NPCs später manuell erstellen, wenn sie in der Geschichte auftauchen.
              </p>
            </div>
          )}

          {/* Suggested Locations */}
          {suggestedLocations.length > 0 && (
            <div className="rounded border border-yellow-700/50 bg-yellow-950/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <h3 className="font-barlow font-bold text-sm text-yellow-400 uppercase">
                  ⚠️ Vorgeschlagene Orte
                </h3>
              </div>
              <p className="font-libre text-sm text-gray-300 mb-3">
                Die KI hat diese neuen Orte in der Backstory gefunden, die noch nicht existieren:
              </p>
              <ul className="space-y-2">
                {suggestedLocations.map((location, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 rounded bg-background-dark p-2 border border-hero-border/20"
                  >
                    <BookOpen className="h-4 w-4 text-accent-gold" />
                    <span className="font-libre text-white">{location}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-libre text-xs text-gray-500">
                Du kannst diese Orte später manuell erstellen, wenn sie in der Geschichte auftauchen.
              </p>
            </div>
          )}

          {/* No Suggestions */}
          {suggestedNPCs.length === 0 && suggestedLocations.length === 0 && !questTitle && (
            <div className="rounded border border-hero-border/30 bg-background-dark p-4 text-center">
              <p className="font-libre text-sm text-gray-400">
                Keine zusätzlichen Vorschläge. Der Charakter wurde erfolgreich integriert.
              </p>
            </div>
          )}
        </div>

        {/* Footer (Fixed) */}
        <div className="flex-none p-6 border-t border-hero-dark bg-background-dark/50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors"
            >
              Verstanden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

