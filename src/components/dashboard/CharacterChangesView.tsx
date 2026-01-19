"use client";

import { useState } from "react";
import { Check, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { acceptProposedChanges } from "@/src/app/dashboard/campaigns/[id]/character-review-actions";

type Character = {
  id: string;
  name: string;
  modification_log?: any[] | null;
};

type CharacterChangesViewProps = {
  campaignId: string;
  character: Character;
  onResolve: () => void;
  onBack: () => void;
};

export function CharacterChangesView({
  campaignId,
  character,
  onResolve,
  onBack,
}: CharacterChangesViewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAcceptChanges() {
    setIsProcessing(true);
    setError(null);

    try {
      await acceptProposedChanges(character.id, campaignId);
      onResolve();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Akzeptieren der Änderungen.");
      setIsProcessing(false);
    }
  }

  const changes = character.modification_log || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="rounded-md p-2 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-barlow font-bold text-2xl uppercase text-hero-vibrant">
          Vorgeschlagene Änderungen: {character.name}
        </h2>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border-2 border-blue-600/50 bg-blue-950/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-blue-400" />
          <p className="font-barlow font-bold text-sm text-blue-400 uppercase">
            Der GM hat Änderungen vorgeschlagen
          </p>
        </div>
        <p className="font-libre text-sm text-gray-300">
          Bitte überprüfe die vorgeschlagenen Änderungen. Wenn du zustimmst, werden sie automatisch
          übernommen und der Charakter wird akzeptiert.
        </p>
      </div>

      {/* Changes List */}
      {changes.length === 0 ? (
        <div className="rounded-lg border border-hero-dark bg-background-card p-6">
          <p className="font-libre text-gray-400 italic">Keine spezifischen Änderungen dokumentiert.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-hero-dark bg-background-card p-6 space-y-4">
          <h3 className="font-barlow font-bold text-lg uppercase text-white mb-4">
            Änderungsübersicht
          </h3>
          <div className="space-y-3">
            {changes.map((change: any, index: number) => (
              <div
                key={index}
                className="rounded border border-hero-dark bg-background-dark p-4 space-y-2"
              >
                <p className="font-barlow font-bold text-sm text-accent-gold uppercase">
                  {change.field}
                </p>
                <div className="grid md:grid-cols-2 gap-4 font-libre text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Alt:</p>
                    <p className="text-gray-300 line-through">{String(change.old_value || "-")}</p>
                  </div>
                  <div>
                    <p className="text-hero-vibrant mb-1">Neu:</p>
                    <p className="text-white font-semibold">{String(change.new_value || "-")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleAcceptChanges}
          disabled={isProcessing}
          className="flex items-center gap-2 rounded border border-hero-border bg-hero-vibrant px-6 py-3 font-barlow font-bold text-sm uppercase text-background-dark shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Wird verarbeitet...
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              Änderungen akzeptieren
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}





