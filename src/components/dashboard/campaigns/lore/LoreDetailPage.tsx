"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { SecretsManager } from "@/src/components/dashboard/campaigns/secrets/SecretsManager";
import { UniversalSecretModal } from "@/src/components/dashboard/campaigns/secrets/UniversalSecretModal";
import { NPCCarousel } from "@/src/components/dashboard/campaigns/npcs/NPCCarousel";
import { LoreHierarchyManager } from "./LoreHierarchyManager";
import { LoreHeader } from "./LoreHeader";
import { LoreDescription } from "./LoreDescription";
import { LoreGallery } from "./LoreGallery";
import { LoreGMNotes } from "./LoreGMNotes";

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  image_url: string | null;
  additional_images?: Array<{ url: string; description: string }> | null;
  gm_notes: string | null;
  is_revealed: boolean;
  parent_id: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
};

type LocationNPCs = {
  residents: Array<{ id: string; name: string; image_url: string | null; role: string | null; status: string | null }>;
  guests: Array<{ id: string; name: string; image_url: string | null; role: string | null; status: string | null }>;
};

type Props = {
  lore: LoreEntry;
  campaignId: string;
  isGM: boolean;
  locationNPCs?: LocationNPCs | null;
  childEntries?: Array<{ id: string; name: string; type: string; image_url: string | null; is_revealed: boolean; created_at?: string; is_favorite?: boolean; published_at?: string; latest_secret_discovered_at?: string | null; has_recent_secret?: boolean }>;
  breadcrumb?: Array<{ id: string; name: string; type: string }>;
  parentOptions?: Array<{ id: string; name: string; type: string }>;
  orphanedEntries?: Array<{ id: string; name: string; type: string; image_url: string | null }>;
};

export function LoreDetailPage({ 
  lore: initialLore, 
  campaignId, 
  isGM, 
  locationNPCs = { residents: [], guests: [] },
  childEntries = [],
  breadcrumb = [],
  parentOptions = [],
  orphanedEntries = []
}: Props) {
  const router = useRouter();
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [secretsRefreshKey, setSecretsRefreshKey] = useState(0);

  // Safe check: Ensure lore exists
  if (!initialLore || !initialLore.name) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-500 mb-2">Lore-Eintrag nicht gefunden</h2>
        <p className="text-gray-400 mb-4">Dieser Eintrag existiert nicht oder wurde gelöscht.</p>
        <a
          href={`/dashboard/campaigns/${campaignId}?tab=lore`}
          className="text-hero-vibrant hover:underline mt-4 inline-block"
        >
          &larr; Zurück zur Übersicht
        </a>
      </div>
    );
  }
  
  // Parse additional_images if it's a string (from database)
  const parseAdditionalImages = (images: any): Array<{ url: string; description: string }> | null => {
    if (!images) return null;
    if (typeof images === 'string') {
      try {
        return JSON.parse(images);
      } catch {
        return null;
      }
    }
    if (Array.isArray(images)) return images;
    return null;
  };
  
  const lore = {
    ...initialLore,
    additional_images: parseAdditionalImages(initialLore.additional_images),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <LoreHeader
        lore={lore}
        campaignId={campaignId}
        isGM={isGM}
        breadcrumb={breadcrumb}
        parentOptions={parentOptions}
      />

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <LoreDescription lore={lore} isGM={isGM} />

          {/* Hierarchie-Sektion */}
          <LoreHierarchyManager 
            lore={lore} 
            childEntries={childEntries} 
            isGM={isGM} 
            campaignId={campaignId} 
            orphanedEntries={orphanedEntries}
          />

          {/* Image Gallery */}
          <LoreGallery lore={lore} isGM={isGM} />

          {/* Secrets Manager */}
          <div 
            className="rounded-lg p-6 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.8)] transition-shadow duration-300"
            style={{
              border: "3px solid #B8860B",
              backgroundImage: "url('/images/backgrounds/dark-wood.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            <div className="relative z-10">
              {isGM && (
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsSecretModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    ✨ Plot-Geheimnis mit KI weben
                  </button>
                </div>
              )}
              <SecretsManager
                entityId={lore.id}
                entityType="lore"
                campaignId={campaignId}
                isGM={isGM}
                refreshKey={secretsRefreshKey}
              />
            </div>
          </div>
        </div>

        {/* Sidebar - GM Notes */}
        <LoreGMNotes lore={lore} isGM={isGM} />
      </div>

      {/* Bewohner-Sektion */}
      {(locationNPCs?.residents?.length ?? 0) > 0 && (
        <NPCCarousel residents={locationNPCs?.residents || []} isGM={isGM} campaignId={campaignId} title="Bewohner & Ansässige" />
      )}
      {(locationNPCs?.guests?.length ?? 0) > 0 && (
        <NPCCarousel residents={locationNPCs?.guests || []} isGM={isGM} campaignId={campaignId} title="Aktuelle Gäste" />
      )}

      {/* Universal Secret AI Modal */}
      {isGM && (
        <UniversalSecretModal
          entityId={lore.id}
          entityType="lore"
          campaignId={campaignId}
          entityName={lore.name}
          isOpen={isSecretModalOpen}
          onClose={() => setIsSecretModalOpen(false)}
          onCreated={() => {
            // Trigger refresh der Secrets-Liste
            setSecretsRefreshKey((prev) => prev + 1);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
