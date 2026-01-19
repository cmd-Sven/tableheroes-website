"use client";

import { useState, useEffect } from "react";
import { X, Book, Loader2 } from "lucide-react";
import { getLoreById } from "@/src/app/dashboard/campaigns/[id]/lore-actions";

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  image_url: string | null;
};

type Props = {
  lore: LoreEntry | null;
  isOpen: boolean;
  onClose: () => void;
};

export function LoreDetailModal({ lore, isOpen, onClose }: Props) {
  const [fullLore, setFullLore] = useState<LoreEntry | null>(lore);
  const [isLoading, setIsLoading] = useState(false);

  // Nachladen wenn Daten unvollständig sind
  useEffect(() => {
    if (!isOpen || !lore) {
      setFullLore(null);
      return;
    }

    // Prüfe ob Daten fehlen
    const needsReload = !lore.description || !lore.image_url;

    if (needsReload && lore.id) {
      setIsLoading(true);
      getLoreById(lore.id)
        .then((data) => {
          setFullLore(data as LoreEntry);
        })
        .catch((error) => {
          console.error("Error loading lore:", error);
          // Fallback: Nutze die vorhandenen Daten
          setFullLore(lore);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setFullLore(lore);
    }
  }, [isOpen, lore]);

  if (!isOpen || !fullLore) return null;

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
            <Book className="h-5 w-5 text-accent-gold" />
            <h2 className="font-cinzel font-bold text-2xl text-white">{fullLore.name}</h2>
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
        <div className="flex-1 overflow-y-auto p-6">
          {/* Type Badge */}
          <div className="mb-4">
            <span className="inline-block px-3 py-1 rounded text-xs font-barlow font-bold uppercase border border-hero-border bg-hero-dark text-hero-vibrant">
              {fullLore.type}
            </span>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent-gold" />
              <span className="ml-3 font-libre text-gray-400">Lade Details...</span>
            </div>
          )}

          {/* Image (if available) */}
          {fullLore.image_url && (
            <div className="mb-6 rounded-lg overflow-hidden border border-hero-dark">
              <img
                src={fullLore.image_url}
                alt={fullLore.name}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Description */}
          {fullLore.description ? (
            <div className="space-y-2">
              <h3 className="font-barlow font-semibold text-lg text-accent-gold uppercase">
                Beschreibung
              </h3>
              <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
                {fullLore.description}
              </p>
            </div>
          ) : !isLoading ? (
            <p className="font-libre text-gray-500 italic">Keine Beschreibung verfügbar.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}


