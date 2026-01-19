"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Edit2, Save, X, Loader2, Plus, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { updateLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";

type AdditionalImage = {
  url: string;
  description: string;
};

type Props = {
  lore: { id: string; additional_images?: AdditionalImage[] | null };
  isGM: boolean;
  onUpdate?: () => void;
};

export function LoreGallery({ lore: initialLore, isGM, onUpdate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditingGallery, setIsEditingGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<AdditionalImage[]>(
    initialLore.additional_images || []
  );
  const [lightboxImage, setLightboxImage] = useState<{ url: string; description: string; index: number } | null>(null);

  // Sync gallery images when lore changes
  useEffect(() => {
    if (!isEditingGallery) {
      setGalleryImages(initialLore.additional_images || []);
    }
  }, [initialLore.additional_images, isEditingGallery]);

  // Close lightbox on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxImage) {
        setLightboxImage(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [lightboxImage]);

  const handleSaveGallery = () => {
    startTransition(async () => {
      try {
        // Filter out empty images
        const validImages = galleryImages.filter((img) => img.url.trim() !== "");
        
        await updateLoreEntry(initialLore.id, {
          additional_images: validImages.length > 0 ? validImages : null,
        });
        
        setGalleryImages(validImages);
        setIsEditingGallery(false);
        router.refresh();
        onUpdate?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Fehler beim Speichern der Galerie.";
        alert(errorMessage);
      }
    });
  };

  const handleCancelGallery = () => {
    setGalleryImages(initialLore.additional_images || []);
    setIsEditingGallery(false);
  };

  const addGalleryImage = () => {
    setGalleryImages([...galleryImages, { url: "", description: "" }]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const updateGalleryImage = (index: number, field: "url" | "description", value: string) => {
    setGalleryImages(
      galleryImages.map((img, i) => (i === index ? { ...img, [field]: value } : img))
    );
  };

  return (
    <>
      <div 
        className="rounded-lg p-6 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.8)] transition-shadow duration-300"
        style={{
          border: "3px solid #B8860B",
          backgroundImage: "url('/images/backgrounds/dark-marble.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 flex-1">
              Bildergalerie
            </h2>
            {isGM && !isEditingGallery && (
              <button
                onClick={() => {
                  setGalleryImages(initialLore.additional_images || []);
                  setIsEditingGallery(true);
                }}
                className="p-1.5 rounded text-slate-500 hover:text-accent-gold hover:bg-hero-dark transition-colors"
                title="Galerie bearbeiten"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {isEditingGallery ? (
            <div className="space-y-4">
              {galleryImages.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {galleryImages.map((img, index) => (
                    <div key={index} className="rounded-lg border border-hero-border bg-slate-900/50 p-4 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-barlow font-bold text-sm text-gray-400">Bild {index + 1}</span>
                        <button
                          onClick={() => removeGalleryImage(index)}
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-900/20 transition-colors"
                          title="Entfernen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {img.url && (
                        <div className="relative w-full aspect-video rounded overflow-hidden border border-hero-border mb-2">
                          <Image
                            src={img.url}
                            alt={img.description || `Bild ${index + 1}`}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <input
                        type="url"
                        value={img.url}
                        onChange={(e) => updateGalleryImage(index, "url", e.target.value)}
                        className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white text-sm outline-none transition-all focus:border-accent-gold"
                        placeholder="https://example.com/image.jpg"
                      />
                      <input
                        type="text"
                        value={img.description}
                        onChange={(e) => updateGalleryImage(index, "description", e.target.value)}
                        className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white text-sm outline-none transition-all focus:border-accent-gold"
                        placeholder="Kurze Beschreibung (optional)"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 font-libre text-sm italic text-center py-4">
                  Noch keine Bilder hinzugefügt.
                </p>
              )}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={addGalleryImage}
                  className="flex items-center gap-2 px-4 py-2 rounded border border-hero-vibrant/50 bg-hero-vibrant/10 text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors text-sm font-barlow font-bold uppercase"
                >
                  <Plus className="h-4 w-4" />
                  Bild hinzufügen
                </button>
                <button
                  onClick={handleSaveGallery}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-green-900/50 text-green-300 border border-green-700 hover:bg-green-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-barlow font-bold uppercase"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Speichern
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelGallery}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-barlow font-bold uppercase"
                >
                  <X className="h-4 w-4" />
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <>
              {initialLore.additional_images && initialLore.additional_images.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {initialLore.additional_images.map((img, index) => (
                    <div 
                      key={index} 
                      className="group relative rounded-lg border border-hero-border overflow-hidden bg-hero-dark/30 cursor-pointer hover:border-hero-vibrant transition-all"
                      onClick={() => setLightboxImage({ url: img.url, description: img.description, index })}
                    >
                      <div className="relative w-full aspect-video">
                        <Image
                          src={img.url}
                          alt={img.description || `Bild ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        {/* Zoom Icon Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                        </div>
                      </div>
                      {img.description && (
                        <div className="p-3">
                          <p className="font-libre text-sm text-gray-300">{img.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="font-libre text-gray-500 italic mb-4">
                    {isGM ? "Noch keine zusätzlichen Bilder vorhanden." : "Keine zusätzlichen Bilder vorhanden."}
                  </p>
                  {isGM && (
                    <button
                      onClick={() => {
                        setGalleryImages([]);
                        setIsEditingGallery(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded border border-hero-vibrant/50 bg-hero-vibrant/10 text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors text-sm font-barlow font-bold uppercase"
                    >
                      <Plus className="h-4 w-4" />
                      Erstes Bild hinzufügen
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && initialLore.additional_images && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
            title="Schließen (ESC)"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation Buttons */}
          {initialLore.additional_images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const prevIndex = (lightboxImage.index - 1 + initialLore.additional_images!.length) % initialLore.additional_images!.length;
                  setLightboxImage({
                    url: initialLore.additional_images![prevIndex].url,
                    description: initialLore.additional_images![prevIndex].description,
                    index: prevIndex,
                  });
                }}
                className="absolute left-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
                title="Vorheriges Bild"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextIndex = (lightboxImage.index + 1) % initialLore.additional_images!.length;
                  setLightboxImage({
                    url: initialLore.additional_images![nextIndex].url,
                    description: initialLore.additional_images![nextIndex].description,
                    index: nextIndex,
                  });
                }}
                className="absolute right-4 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
                title="Nächstes Bild"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Image Container */}
          <div 
            className="relative max-w-[90vw] max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full">
              <Image
                src={lightboxImage.url}
                alt={lightboxImage.description || `Bild ${lightboxImage.index + 1}`}
                width={1920}
                height={1080}
                className="object-contain max-w-full max-h-[90vh] rounded-lg"
                priority
              />
            </div>
            {lightboxImage.description && (
              <div className="mt-4 text-center">
                <p className="font-libre text-lg text-white drop-shadow-lg">{lightboxImage.description}</p>
              </div>
            )}
            {initialLore.additional_images.length > 1 && (
              <div className="mt-4 text-center">
                <p className="font-barlow text-sm text-gray-400">
                  Bild {lightboxImage.index + 1} von {initialLore.additional_images.length}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

