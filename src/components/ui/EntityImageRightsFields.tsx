"use client";

import { Sparkles } from "lucide-react";

type Props = {
  /** Upload-Modus: nur Nutzungsrechte. URL-Modus: KI-Kennzeichnung oder URL-Rechte. */
  mode: "upload" | "url";
  isAiGenerated: boolean;
  onIsAiGeneratedChange: (value: boolean) => void;
  uploadRightsConfirmed: boolean;
  onUploadRightsConfirmedChange: (value: boolean) => void;
  urlRightsConfirmed: boolean;
  onUrlRightsConfirmedChange: (value: boolean) => void;
  /** Kurzer Hinweis zur öffentlichen Anzeige (Lore/SEO). */
  showPublicHint?: boolean;
};

export function EntityImageRightsFields({
  mode,
  isAiGenerated,
  onIsAiGeneratedChange,
  uploadRightsConfirmed,
  onUploadRightsConfirmedChange,
  urlRightsConfirmed,
  onUrlRightsConfirmedChange,
  showPublicHint = true,
}: Props) {
  return (
    <div className="rounded border border-hero-border/50 bg-hero-dark/30 p-3 space-y-2">
      <p className="font-barlow text-xs font-bold uppercase text-gray-400">
        Bildrechte (für öffentliche Anzeige)
      </p>

      {mode === "upload" ? (
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={uploadRightsConfirmed}
            onChange={(e) => onUploadRightsConfirmedChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-hero-border accent-accent-gold"
          />
          <span className="font-libre text-xs leading-relaxed text-gray-300">
            Ich bestätige, dass ich die Nutzungsrechte an diesem hochgeladenen Bild besitze oder eine
            entsprechende Lizenz habe.
          </span>
        </label>
      ) : (
        <>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={isAiGenerated}
              onChange={(e) => {
                onIsAiGeneratedChange(e.target.checked);
                if (e.target.checked) onUrlRightsConfirmedChange(false);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-hero-border accent-accent-gold"
            />
            <span className="flex items-center gap-1 font-libre text-xs text-gray-300">
              <Sparkles className="h-3.5 w-3.5 text-accent-gold/80" />
              Bild ist KI-generiert
            </span>
          </label>
          {!isAiGenerated ? (
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={urlRightsConfirmed}
                onChange={(e) => onUrlRightsConfirmedChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-hero-border accent-accent-gold"
              />
              <span className="font-libre text-xs leading-relaxed text-gray-300">
                Ich bestätige die Nutzungsrechte an dieser Bild-URL für die öffentliche Anzeige.
              </span>
            </label>
          ) : null}
        </>
      )}

      {showPublicHint ? (
        <p className="font-libre text-[11px] text-gray-500">
          Ohne Rechtebestätigung oder KI-Kennzeichnung wird das Bild auf der öffentlichen Lore-Seite
          ausgeblendet.
        </p>
      ) : null}
    </div>
  );
}
