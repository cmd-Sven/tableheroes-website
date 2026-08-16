"use client";

import { ImageIcon, Loader2, RefreshCw, SkipForward, Sparkles } from "lucide-react";
import { normalizeImageDisplay, type ImageDisplaySettings } from "@/src/lib/image-display";
import { NpcPortraitUploadField } from "@/src/components/dashboard/campaigns/npcs/NpcPortraitUploadField";
import { NpcPortraitAttribution } from "@/src/components/dashboard/campaigns/npcs/NpcPortraitAttribution";
import { NpcTokenCropEditor } from "@/src/components/dashboard/campaigns/npcs/NpcTokenCropEditor";
import type { NpcTokenBorder } from "@/src/lib/npcs/npc-sheet-types";

type Props = {
  npcName: string;
  appearancePreview: string;
  imageUrl: string | null;
  portraitFile: File | null;
  onPortraitFileChange: (file: File | null) => void;
  imageDisplay: ImageDisplaySettings;
  onImageDisplayChange: (value: ImageDisplaySettings) => void;
  portraitSkipped: boolean;
  portraitIsAiGenerated: boolean;
  uploadRightsConfirmed: boolean;
  onUploadRightsConfirmedChange: (confirmed: boolean) => void;
  isGenerating: boolean;
  canGenerate: boolean;
  disabledReason?: string;
  onGenerate: () => void;
  onSkip: () => void;
  onClearSkip: () => void;
  /** Optionaler Token-Crop aus dem Portrait */
  tokenCrop?: {
    enabled: boolean;
    onEnabledChange: (v: boolean) => void;
    border: NpcTokenBorder;
    onBorderChange: (b: NpcTokenBorder) => void;
    onTokenBlobChange: (file: File | null) => void;
  };
};

export function NpcPortraitStep({
  npcName,
  appearancePreview,
  imageUrl,
  portraitFile,
  onPortraitFileChange,
  imageDisplay,
  onImageDisplayChange,
  portraitSkipped,
  portraitIsAiGenerated,
  uploadRightsConfirmed,
  onUploadRightsConfirmedChange,
  isGenerating,
  canGenerate,
  disabledReason,
  onGenerate,
  onSkip,
  onClearSkip,
  tokenCrop,
}: Props) {
  return (
    <div className="space-y-6">
      <p className="font-libre text-gray-200 text-sm">
        Optional: Portrait per KI erzeugen oder direkt hochladen. Du kannst den Schritt auch
        überspringen und das Bild später in den NSC-Einstellungen ergänzen.
      </p>

      <div className="rounded-lg border border-hero-border bg-slate-900/40 p-4">
        <p className="font-barlow font-bold text-xs uppercase text-gray-400 mb-2">Aussehen (Grundlage)</p>
        <p className="font-libre text-sm text-gray-300 line-clamp-4">{appearancePreview || "—"}</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {imageUrl ? (
          <div className="relative w-full max-w-sm space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Portrait von ${npcName}`}
              className="w-full rounded-lg border-2 border-accent-gold/50 shadow-lg object-cover aspect-square"
            />
            {portraitIsAiGenerated && !portraitFile ? (
              <NpcPortraitAttribution isAiGenerated className="py-0.5" />
            ) : null}
          </div>
        ) : portraitSkipped ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-hero-border bg-slate-900/30 p-8 w-full max-w-sm text-center">
            <SkipForward className="h-10 w-10 text-gray-500" />
            <p className="font-libre text-sm text-gray-400">Portrait übersprungen</p>
            <button
              type="button"
              onClick={onClearSkip}
              className="text-xs font-barlow uppercase text-hero-vibrant hover:underline"
            >
              Doch generieren
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-hero-border bg-slate-900/30 p-8 w-full max-w-sm text-center">
            <ImageIcon className="h-12 w-12 text-gray-600" />
            <p className="font-libre text-sm text-gray-400">Noch kein Portrait</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !canGenerate}
            className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : imageUrl ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {imageUrl ? "Neu generieren" : "Portrait generieren"}
          </button>

          {!imageUrl && !portraitSkipped && (
            <button
              type="button"
              onClick={onSkip}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold text-sm uppercase text-gray-400 hover:text-white disabled:opacity-50"
            >
              <SkipForward className="h-4 w-4" />
              Überspringen
            </button>
          )}
        </div>

        {!canGenerate && disabledReason && (
          <p className="font-libre text-xs text-amber-200/80 text-center max-w-md">{disabledReason}</p>
        )}
      </div>

      <div className="rounded-lg border border-hero-border/60 bg-slate-900/30 p-4">
        <p className="font-barlow font-bold text-xs uppercase text-gray-400 mb-3">
          Oder Portrait hochladen
        </p>
        <NpcPortraitUploadField
          imageUrl={imageUrl ?? ""}
          portraitFile={portraitFile}
          onPortraitFileChange={(file) => {
            onPortraitFileChange(file);
            if (file) onClearSkip();
          }}
          imageDisplay={imageDisplay}
          onImageDisplayChange={onImageDisplayChange}
          onClearImage={() => {
            onPortraitFileChange(null);
            onImageDisplayChange(normalizeImageDisplay(null));
          }}
          isAiGenerated={portraitIsAiGenerated}
          uploadRightsConfirmed={uploadRightsConfirmed}
          onUploadRightsConfirmedChange={onUploadRightsConfirmedChange}
          previewAspectClassName="aspect-square max-w-sm"
          compact
        />
        {portraitFile && !uploadRightsConfirmed ? (
          <p className="mt-2 font-libre text-xs text-amber-200/90">
            Bitte bestätige die Nutzungsrechte am hochgeladenen Bild, um fortzufahren.
          </p>
        ) : null}
      </div>

      {imageUrl && !portraitSkipped && tokenCrop ? (
        <NpcTokenCropEditor
          imageUrl={imageUrl}
          enabled={tokenCrop.enabled}
          onEnabledChange={tokenCrop.onEnabledChange}
          border={tokenCrop.border}
          onBorderChange={tokenCrop.onBorderChange}
          onTokenBlobChange={tokenCrop.onTokenBlobChange}
        />
      ) : null}
    </div>
  );
}
