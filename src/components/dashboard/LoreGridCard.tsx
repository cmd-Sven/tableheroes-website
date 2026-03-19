"use client";

import { Info, MapPin, BookOpen, Users, Sparkles, Church, Scroll, Castle, Sun, Pencil, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleLoreFavorite } from "@/src/app/dashboard/campaigns/[id]/lore-actions";

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  image_url: string | null;
  is_revealed: boolean;
  parent_id?: string | null;
  parentName?: string | null;
  is_favorite?: boolean;
  created_at?: string;
  has_recent_secret?: boolean; // True if a secret was created within 48h
};

type Props = {
  lore: LoreEntry;
  campaignId: string;
  isGM?: boolean;
  onDelete?: (lore: LoreEntry) => void;
  onToggleVisibility?: (lore: LoreEntry) => void;
  /** Wenn gesetzt, wird dieser Link statt Kampagnen-Lore-Detail verwendet (z.B. Welt-Bearbeitung). */
  detailHref?: string;
};

export function LoreGridCard({ lore, campaignId, isGM = false, onDelete, onToggleVisibility, detailHref }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isFavorite, setIsFavorite] = useState(lore.is_favorite || false);

  // Badge Logic
  const isNew = () => {
    if (!lore.created_at) return false;
    const created = new Date(lore.created_at);
    const now = new Date();
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return diffHours < 48;
  };

  const isUpdate = () => {
    if (isNew()) return false; // If new, don't show update
    return lore.has_recent_secret || false;
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await toggleLoreFavorite(lore.id, isFavorite);
        setIsFavorite(!isFavorite);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Aktualisieren der Favoriten.";
        alert(errorMessage);
      }
    });
  };

  // Icon mapping based on type
  const getTypeIcon = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes("stadt") || typeLower.includes("region") || typeLower.includes("ort") || typeLower.includes("insel") || typeLower.includes("gebäude") || typeLower.includes("tempel") || typeLower.includes("dorf")) {
      return MapPin;
    }
    if (typeLower.includes("gottheit") || typeLower.includes("religion") || typeLower.includes("glaube")) {
      return Church;
    }
    if (typeLower.includes("magie") || typeLower.includes("artefakt")) {
      return Sparkles;
    }
    if (typeLower.includes("rasse") || typeLower.includes("kultur") || typeLower.includes("sprache")) {
      return Users;
    }
    if (typeLower.includes("ereignis") || typeLower.includes("geschichte") || typeLower.includes("mythos")) {
      return BookOpen;
    }
    if (typeLower.includes("burg") || typeLower.includes("schloss")) {
      return Castle;
    }
    return Scroll; // Default
  };

  const TypeIcon = getTypeIcon(lore.type);

  const handleDelete = () => {
    if (onDelete && confirm(`Möchtest du "${lore.name}" wirklich löschen?`)) {
      onDelete(lore);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group relative h-full flex flex-col rounded-lg border-2 border-transparent overflow-hidden transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-[#C5A572] hover:shadow-xl ${
        !lore.is_revealed && isGM ? "opacity-75 grayscale" : ""
      }`}
      style={{
        backgroundImage: "url('/images/grunge-paper-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Clickable Link Wrapper */}
      <Link
        href={detailHref ?? `/dashboard/campaigns/${campaignId}/lore/${lore.id}`}
        className="absolute inset-0 z-10"
        aria-label={`${lore.name} Details öffnen`}
      />
      {/* Favorite Button - Top Right */}
      <button
        onClick={handleToggleFavorite}
        disabled={isPending}
        className={`absolute top-2 right-2 z-30 p-2 rounded-full transition-all ${
          isFavorite
            ? "text-yellow-500 bg-yellow-500/20 hover:bg-yellow-500/30"
            : "text-gray-500 bg-white/90 backdrop-blur-sm hover:text-yellow-500 hover:bg-yellow-500/20"
        } disabled:opacity-50 shadow-md`}
        title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      >
        <Star className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
      </button>

      {/* Badges - Top Left */}
      <div className="absolute top-2 left-2 z-30 flex flex-col gap-1">
        {isNew() && (
          <span className="px-2 py-0.5 rounded bg-green-500 text-white text-xs font-barlow font-bold uppercase animate-pulse shadow-md">
            [NEU]
          </span>
        )}
        {isUpdate() && (
          <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-xs font-barlow font-bold uppercase shadow-md">
            [UPDATE]
          </span>
        )}
      </div>

      {/* GM Action Bar - Only Visibility Toggle */}
      {isGM && onToggleVisibility && (
        <div className="absolute top-12 right-2 flex items-center gap-1 z-30 bg-white/90 backdrop-blur-sm rounded-md p-1 shadow-md">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(lore);
            }}
            className={`p-1.5 rounded transition-colors ${
              lore.is_revealed
                ? "text-zinc-700 hover:text-amber-700 hover:bg-zinc-900/10"
                : "text-zinc-500 hover:text-amber-700 hover:bg-zinc-900/10"
            }`}
            title={lore.is_revealed ? "Für Spieler sichtbar" : "Verborgen"}
          >
            {lore.is_revealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-1.5 rounded text-zinc-700 hover:text-red-700 hover:bg-red-900/10 transition-colors"
              title="Löschen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {/* Background Icon (decorative) */}
      <div className="absolute top-4 right-4 opacity-10">
        <TypeIcon className="h-16 w-16 text-gray-700" />
      </div>

      {/* Image (if available) */}
      {lore.image_url ? (
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={lore.image_url}
            alt={lore.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
        </div>
      ) : (
        <div className="h-48 w-full flex items-center justify-center relative">
          <TypeIcon className="h-20 w-20 text-gray-400/40" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 relative z-10">
        {/* Title with Icon */}
        <div className="flex items-center gap-2 mb-2">
          <TypeIcon className="h-5 w-5 text-gray-700 flex-shrink-0" />
          <h3 className="font-cinzel font-bold text-lg text-gray-900 line-clamp-2">
            {lore.name}
          </h3>
        </div>

        {/* Type Badge */}
        <div className="mb-2">
          <span className="inline-block px-2 py-1 rounded text-xs font-barlow font-bold uppercase border border-gray-600 bg-gray-100/80 text-gray-800">
            {lore.type}
          </span>
        </div>

        {/* Parent Location Hint */}
        {lore.parent_id && lore.parentName && (
          <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-600">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="font-libre italic">
              In: <span className="font-semibold text-gray-700">{lore.parentName}</span>
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />
      </div>

      {/* Revealed Indicator (only if not GM or if GM and revealed) */}
      {lore.is_revealed && !isGM && (
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-600 border-2 border-gray-800 shadow-lg z-20" />
      )}
    </motion.div>
  );
}

