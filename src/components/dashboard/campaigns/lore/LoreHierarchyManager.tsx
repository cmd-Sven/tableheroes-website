"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FolderTree, Link2, Search, Link2Off, Star, MapPin, Loader2 } from "lucide-react";
import { updateLoreEntry, toggleLoreFavorite } from "@/src/app/dashboard/campaigns/[id]/lore-actions";

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  image_url: string | null;
  is_revealed: boolean;
  created_at?: string;
  published_at?: string;
  is_favorite?: boolean;
  latest_secret_discovered_at?: string | null;
  has_recent_secret?: boolean;
};

type Props = {
  lore: { id: string };
  childEntries: LoreEntry[];
  isGM: boolean;
  campaignId: string;
  orphanedEntries: Array<{ id: string; name: string; type: string; image_url: string | null }>;
};

export function LoreHierarchyManager({ lore, childEntries, isGM, campaignId, orphanedEntries }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLinkingOrphan, setIsLinkingOrphan] = useState(false);
  const [selectedOrphanId, setSelectedOrphanId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Favorite states for child entries
  const [childFavoriteStates, setChildFavoriteStates] = useState<Record<string, boolean>>(
    Object.fromEntries((childEntries || []).map((child) => [child.id, child.is_favorite || false]))
  );

  // Filter orphaned entries based on search query (limit to top 5)
  const filteredOrphanedEntries = (orphanedEntries?.filter(entry =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.type.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []).slice(0, 5);

  // Handler to link an orphaned entry
  const handleLinkOrphan = () => {
    startTransition(async () => {
      if (!selectedOrphanId) return;
      
      try {
        await updateLoreEntry(selectedOrphanId, {
          parent_id: lore.id,
        });
        
        // Refresh the page to show the new child
        router.refresh();
        setIsLinkingOrphan(false);
        setSelectedOrphanId(null);
        setSearchQuery("");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Verknüpfen.";
        alert(errorMessage);
      }
    });
  };

  // Handler to unlink a child entry
  const handleUnlinkChild = (childId: string) => {
    if (!confirm("Möchten Sie diesen Ort wirklich entkoppeln? Er wird dann wieder zu einem Root-Element.")) {
      return;
    }
    
    startTransition(async () => {
      try {
        await updateLoreEntry(childId, {
          parent_id: null,
        });
        
        // Refresh the page to update the child list
        router.refresh();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Entkoppeln.";
        alert(errorMessage);
      }
    });
  };

  // Handler to toggle favorite for child entries
  const handleToggleChildFavorite = (childId: string, currentState: boolean) => {
    const newState = !currentState;
    setChildFavoriteStates((prev) => ({ ...prev, [childId]: newState }));

    startTransition(async () => {
      try {
        await toggleLoreFavorite(childId, currentState);
        router.refresh();
      } catch (error) {
        // Revert on error
        setChildFavoriteStates((prev) => ({ ...prev, [childId]: currentState }));
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Ändern des Favoriten-Status.";
        alert(errorMessage);
      }
    });
  };

  return (
    <div 
      className="rounded-lg p-6 relative overflow-hidden shadow-xl transition-shadow duration-300 border-2 border-accent-gold/30"
      style={{
        backgroundImage: "url('/images/backgrounds/dark-marble.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        boxShadow: "inset 0 0 100px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.6)",
      }}
    >
      {/* Dark Overlay for readability */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 flex items-center gap-2">
            <FolderTree className="h-6 w-6" />
            Untergeordnete Regionen & Orte
          </h2>
          {isGM && (
            <button
              onClick={() => setIsLinkingOrphan(!isLinkingOrphan)}
              className="flex items-center gap-2 px-4 py-2 rounded border border-hero-vibrant/50 bg-hero-vibrant/10 text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors text-sm font-barlow font-bold uppercase"
            >
              <Link2 className="h-4 w-4" />
              {isLinkingOrphan ? "Abbrechen" : "+ Bestehenden Ort verknüpfen"}
            </button>
          )}
        </div>

        {/* Link Orphan Dialog - Always visible for GM */}
        {isGM && (
          <div className="mb-6 p-4 rounded-lg border border-hero-border bg-hero-dark/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-barlow font-semibold text-lg text-accent-gold flex items-center gap-2">
                <Search className="h-5 w-5" />
                Verwaisten Ort verknüpfen
              </h3>
              {isLinkingOrphan && (
                <button
                  onClick={() => {
                    setIsLinkingOrphan(false);
                    setSelectedOrphanId(null);
                    setSearchQuery("");
                  }}
                  className="px-3 py-1 rounded border border-hero-border text-gray-300 hover:bg-hero-dark/50 transition-colors text-xs font-barlow font-bold uppercase"
                >
                  Abbrechen
                </button>
              )}
            </div>
            
            {/* Search Input - Always visible */}
            <div className="mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche nach Ort..."
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white text-sm outline-none focus:border-hero-vibrant"
              />
            </div>

            {/* Search Results - Always visible when there are results */}
            {filteredOrphanedEntries.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
                {filteredOrphanedEntries.map((orphan) => (
                  <button
                    key={orphan.id}
                    onClick={() => {
                      setSelectedOrphanId(orphan.id);
                      setIsLinkingOrphan(true);
                    }}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedOrphanId === orphan.id
                        ? "border-accent-gold bg-accent-gold/20 shadow-lg shadow-accent-gold/30"
                        : "border-hero-border bg-hero-dark/30 hover:bg-hero-dark/50 hover:border-hero-vibrant/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {orphan.image_url ? (
                        <div className="relative w-16 h-16 rounded overflow-hidden shrink-0 border border-hero-border">
                          <Image
                            src={orphan.image_url}
                            alt={orphan.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded bg-hero-dark/50 border border-hero-border flex items-center justify-center shrink-0">
                          <MapPin className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-cinzel font-bold text-lg text-accent-gold mb-1">{orphan.name}</h4>
                        <p className="font-libre text-gray-400 text-sm">{orphan.type}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 font-libre text-sm italic text-center py-4">
                {searchQuery ? "Keine passenden Orte gefunden." : "Keine verwaisten Orte verfügbar."}
              </p>
            )}

            {/* Link Button - Always visible when an orphan is selected */}
            {selectedOrphanId && (
              <div className="flex items-center gap-2 pt-3 border-t border-hero-border">
                <button
                  onClick={handleLinkOrphan}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-hero-vibrant text-black hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-barlow font-bold uppercase"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verknüpfen...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Jetzt verknüpfen
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedOrphanId(null);
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded border border-hero-border text-gray-300 hover:bg-hero-dark/50 transition-colors text-sm font-barlow font-bold uppercase"
                >
                  Auswahl zurücksetzen
                </button>
              </div>
            )}
          </div>
        )}

        {/* Child Entries Grid */}
        {childEntries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {childEntries.map((child) => {
              // Badge Logic for child entries
              const isChildNew = () => {
                const dateToCheck = child.created_at || child.published_at;
                if (!dateToCheck) return false;
                const created = new Date(dateToCheck);
                const now = new Date();
                const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
                return diffHours < 48;
              };

              const isFavorite = childFavoriteStates[child.id] || false;

              return (
                <div
                  key={child.id}
                  className="group relative rounded-lg p-4 transition-all hover:scale-[1.02]"
                  style={{
                    border: "2px solid rgba(202, 185, 38, 0.5)",
                    backgroundImage: "url('/images/backgrounds/old-paper.jpg')",
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  {/* Favorite Button - Top Right */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleChildFavorite(child.id, isFavorite);
                    }}
                    disabled={isPending}
                    className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-500 hover:text-yellow-500 transition-colors shadow-md disabled:opacity-50"
                    title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
                  >
                    <Star
                      className={`h-4 w-4 transition-all ${
                        isFavorite ? "fill-current text-yellow-500" : ""
                      }`}
                    />
                  </button>

                  {/* Badges - Top Left */}
                  <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                    {isChildNew() && (
                      <span className="px-2 py-0.5 rounded bg-green-500 text-white text-xs font-barlow font-bold uppercase animate-pulse shadow-md">
                        [NEU]
                      </span>
                    )}
                    {!isChildNew() && child.has_recent_secret && (
                      <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-xs font-barlow font-bold uppercase shadow-md">
                        [UPDATE]
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/lore/${child.id}`}
                    className="block relative z-10"
                  >
                    {child.image_url ? (
                      <div className="relative w-full aspect-video mb-3 rounded overflow-hidden border border-accent-gold/30">
                        <Image
                          src={child.image_url}
                          alt={child.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video mb-3 rounded bg-gray-800/50 border border-accent-gold/30 flex items-center justify-center">
                        <MapPin className="h-12 w-12 text-gray-600" />
                      </div>
                    )}
                    <h3 className="font-cinzel font-bold text-lg text-gray-900 group-hover:text-accent-gold transition-colors mb-2">
                      {child.name}
                    </h3>
                    <p className="font-libre text-gray-700 text-sm">
                      {child.type}
                    </p>
                    {!child.is_revealed && isGM && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded bg-red-900/50 border border-red-700 text-red-300 text-xs font-barlow font-bold uppercase">
                        Verborgen
                      </span>
                    )}
                  </Link>
                  {/* Unlink Button - GM only */}
                  {isGM && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUnlinkChild(child.id);
                      }}
                      disabled={isPending}
                      className="absolute bottom-2 right-2 p-2 rounded border border-red-500/50 bg-red-900/20 hover:bg-red-900/30 transition-colors disabled:opacity-50 z-20"
                      title="Ort entkoppeln"
                    >
                      <Link2Off className="h-4 w-4 text-red-400" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 font-libre text-sm italic mb-4">
              Noch keine untergeordneten Orte vorhanden.
            </p>
            {isGM && !isLinkingOrphan && (
              <button
                onClick={() => setIsLinkingOrphan(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant hover:bg-hero-vibrant/30 transition-colors font-barlow font-bold uppercase text-sm"
              >
                <Link2 className="h-5 w-5" />
                Bestehenden Ort verknüpfen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

