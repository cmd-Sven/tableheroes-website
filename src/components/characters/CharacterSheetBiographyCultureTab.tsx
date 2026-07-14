"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Globe,
  Info,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  User,
  Coins,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CharacterAvatarImage } from "@/src/components/dashboard/player/CharacterAvatarImage";
import { ImageUrlDisplayEditor } from "@/src/components/ui/ImageUrlDisplayEditor";
import type { ImageDisplaySettings } from "@/src/lib/image-display";
import {
  PROFILE_MEDIA_ACCEPT_MIME,
  PROFILE_MEDIA_MAX_BYTES,
  validateProfileImageFile,
} from "@/src/lib/profile-media";
import {
  CHARACTER_CONDITION_DEFINITIONS,
  type CharacterConditionKey,
  type ConditionTokensMap,
} from "@/src/lib/characters/condition-tokens";
import {
  type CharacterFlawEntry,
} from "@/src/lib/characters/character-flaws";
import { CharacterFlawSummary } from "@/src/components/characters/CharacterFlawPicker";
import {
  DND5E_ALIGNMENTS,
  findAlignmentOption,
} from "@/src/lib/characters/dnd5e-alignments";
import {
  generateCharacterConditionToken,
  removeCharacterConditionToken,
} from "@/src/app/dashboard/campaigns/[id]/character-token-actions";

type LanguageOption = { id: string; name: string };
type LocationOption = { id: string; name: string; type?: string };
type CultureOption = { id: string; name: string };

export type CharacterSheetBiographyCultureTabProps = {
  campaignId: string;
  characterId: string;
  readOnly?: boolean;
  avatarUrl: string;
  onAvatarUrlChange: (url: string) => void;
  avatarFile: File | null;
  onAvatarFileChange: (file: File | null) => void;
  avatarBlobUrl: string | null;
  avatarDisplay: ImageDisplaySettings;
  onAvatarDisplayChange: (value: ImageDisplaySettings) => void;
  onClearAvatar: () => void;
  tokenUrl: string;
  onTokenUrlChange: (url: string) => void;
  tokenFile: File | null;
  onTokenFileChange: (file: File | null) => void;
  tokenBlobUrl: string | null;
  onClearToken: () => void;
  onCopyTokenFromPortrait: () => void;
  level: number;
  alignment: string;
  onAlignmentChange: (value: string) => void;
  alignmentImportedFromFoundry?: boolean;
  bioFamily: string;
  onBioFamilyChange: (value: string) => void;
  bioOccupation: string;
  onBioOccupationChange: (value: string) => void;
  bioAppearance: string;
  onBioAppearanceChange: (value: string) => void;
  characterFlaws: CharacterFlawEntry[];
  onCharacterFlawsChange: (entries: CharacterFlawEntry[]) => void;
  cultureLoreId: string;
  onCultureChange: (id: string) => void;
  cultureOptions: CultureOption[];
  languages: string[];
  onToggleLanguage: (id: string) => void;
  languageOptions: LanguageOption[];
  currentLocationId: string;
  onCurrentLocationChange: (id: string) => void;
  locationOptions: LocationOption[];
  conditionTokens: ConditionTokensMap;
  onConditionTokensChange: (next: ConditionTokensMap) => void;
};

function TokenPreview({
  src,
  label,
  className = "h-28 w-28",
}: {
  src: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border-2 border-hero-border bg-hero-dark ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} className="h-full w-full object-cover" />
    </div>
  );
}

export function CharacterSheetBiographyCultureTab({
  campaignId,
  characterId,
  readOnly = false,
  avatarUrl,
  onAvatarUrlChange,
  avatarFile,
  onAvatarFileChange,
  avatarBlobUrl,
  avatarDisplay,
  onAvatarDisplayChange,
  onClearAvatar,
  tokenUrl,
  onTokenUrlChange,
  tokenFile,
  onTokenFileChange,
  tokenBlobUrl,
  onClearToken,
  onCopyTokenFromPortrait,
  alignment,
  onAlignmentChange,
  alignmentImportedFromFoundry = false,
  bioFamily,
  onBioFamilyChange,
  bioOccupation,
  onBioOccupationChange,
  bioAppearance,
  onBioAppearanceChange,
  characterFlaws,
  cultureLoreId,
  onCultureChange,
  cultureOptions,
  languages,
  onToggleLanguage,
  languageOptions,
  currentLocationId,
  onCurrentLocationChange,
  locationOptions,
  conditionTokens,
  onConditionTokensChange,
}: CharacterSheetBiographyCultureTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [generatingKey, setGeneratingKey] = useState<CharacterConditionKey | null>(null);

  const portraitPreview = avatarBlobUrl || avatarUrl.trim();
  const tokenPreview = tokenBlobUrl || tokenUrl.trim() || portraitPreview;
  const selectedAlignment = findAlignmentOption(alignment);

  const textareaClass = `w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none ${
    readOnly ? "cursor-default opacity-80" : ""
  }`;

  const handleGenerateCondition = (key: CharacterConditionKey) => {
    if (readOnly) return;
    if (!portraitPreview && !tokenUrl.trim()) {
      alert("Bitte lade zuerst ein Portrait oder Basis-Token hoch.");
      return;
    }
    setGeneratingKey(key);
    startTransition(async () => {
      const result = await generateCharacterConditionToken({
        campaignId,
        characterId,
        conditionKey: key,
      });
      setGeneratingKey(null);
      if (!result.success || !result.entry) {
        alert(result.error ?? "KI-Generierung fehlgeschlagen.");
        return;
      }
      onConditionTokensChange({ ...conditionTokens, [key]: result.entry });
      router.refresh();
    });
  };

  const handleRemoveCondition = (key: CharacterConditionKey) => {
    if (readOnly) return;
    if (!confirm("Zustands-Token wirklich entfernen?")) return;
    startTransition(async () => {
      const result = await removeCharacterConditionToken({
        campaignId,
        characterId,
        conditionKey: key,
      });
      if (!result.success) {
        alert(result.error ?? "Löschen fehlgeschlagen.");
        return;
      }
      const next = { ...conditionTokens };
      delete next[key];
      onConditionTokensChange(next);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
        <div className="border-b border-hero-dark pb-2">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
            <User className="h-4 w-4" />
            Portrait &amp; Karten-Token
          </h3>
          <p className="mt-1 font-libre text-xs text-gray-500">
            Das Portrait erscheint im Profil. Der Token wird auf der Karte genutzt — ohne eigenes Token
            wird das Portrait übernommen.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Portrait */}
          <div className="space-y-3">
            <label className="block text-xs font-barlow font-bold uppercase text-gray-500">
              Charakterportrait
            </label>
            <div className="flex flex-wrap items-start gap-3">
              {portraitPreview ? (
                <CharacterAvatarImage
                  src={portraitPreview}
                  avatarDisplay={avatarDisplay}
                  className="h-32 w-32 shrink-0 rounded-lg border-2 border-hero-border bg-hero-dark"
                  alt=""
                />
              ) : (
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-hero-border/60 bg-hero-dark/40 px-2 text-center font-libre text-[10px] text-gray-500">
                  Kein Portrait
                </div>
              )}
              {!readOnly ? (
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="file"
                    accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
                    className="block w-full text-sm text-gray-300 file:mr-2 file:rounded file:border file:border-hero-border file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-xs file:uppercase file:text-hero-vibrant"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (!f) return;
                      const msg = validateProfileImageFile(f);
                      if (msg) {
                        alert(msg);
                        return;
                      }
                      onAvatarFileChange(f);
                    }}
                  />
                  {portraitPreview ? (
                    <button
                      type="button"
                      onClick={onClearAvatar}
                      className="text-sm font-libre text-red-400 hover:underline"
                    >
                      Portrait entfernen
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {!readOnly ? (
              <>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => onAvatarUrlChange(e.target.value)}
                  placeholder="Portrait-URL (optional)"
                  className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
                />
                {portraitPreview ? (
                  <ImageUrlDisplayEditor
                    value={avatarDisplay}
                    onChange={onAvatarDisplayChange}
                    previewUrl={portraitPreview}
                    previewAspectClassName="aspect-[3/4] max-w-[220px]"
                  />
                ) : null}
              </>
            ) : null}
          </div>

          {/* Token */}
          <div className="space-y-3">
            <label className="block text-xs font-barlow font-bold uppercase text-gray-500 flex items-center gap-2">
              <Coins className="h-3.5 w-3.5" />
              Karten-Token
            </label>
            <div className="flex flex-wrap items-start gap-3">
              {tokenPreview ? (
                <TokenPreview src={tokenPreview} label="Token" className="h-32 w-32 rounded-full" />
              ) : (
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-hero-border/60 bg-hero-dark/40 px-2 text-center font-libre text-[10px] text-gray-500">
                  Kein Token
                </div>
              )}
              {!readOnly ? (
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="file"
                    accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
                    className="block w-full text-sm text-gray-300 file:mr-2 file:rounded file:border file:border-hero-border file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-xs file:uppercase file:text-hero-vibrant"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (!f) return;
                      const msg = validateProfileImageFile(f);
                      if (msg) {
                        alert(msg);
                        return;
                      }
                      onTokenFileChange(f);
                    }}
                  />
                  {portraitPreview ? (
                    <button
                      type="button"
                      onClick={onCopyTokenFromPortrait}
                      className="block text-sm font-libre text-hero-vibrant hover:underline"
                    >
                      Vom Portrait übernehmen
                    </button>
                  ) : null}
                  {(tokenPreview && (tokenUrl.trim() || tokenBlobUrl)) ? (
                    <button
                      type="button"
                      onClick={onClearToken}
                      className="block text-sm font-libre text-red-400 hover:underline"
                    >
                      Eigenes Token entfernen
                    </button>
                  ) : null}
                  <p className="font-libre text-[10px] text-gray-500">
                    Max. {Math.round(PROFILE_MEDIA_MAX_BYTES / 1024 / 1024)} MB. Quadratisch empfohlen.
                  </p>
                </div>
              ) : null}
            </div>
            {!readOnly ? (
              <input
                type="url"
                value={tokenUrl}
                onChange={(e) => onTokenUrlChange(e.target.value)}
                placeholder="Token-URL (optional)"
                className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
              />
            ) : null}
            {!tokenUrl.trim() && !tokenBlobUrl && portraitPreview ? (
              <p className="font-libre text-xs text-gray-500 italic">
                Aktuell wird das Portrait als Token verwendet.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2 border-b border-hero-dark pb-2">
          <BookOpen className="h-4 w-4" />
          Biografie
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
              Familie
            </label>
            <textarea
              value={bioFamily}
              readOnly={readOnly}
              onChange={(e) => onBioFamilyChange(e.target.value)}
              rows={3}
              placeholder="Eltern, Geschwister, Herkunft, familiäre Bindungen…"
              className={textareaClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
              Bisherige Tätigkeiten / Beruf / Ausbildung
            </label>
            <textarea
              value={bioOccupation}
              readOnly={readOnly}
              onChange={(e) => onBioOccupationChange(e.target.value)}
              rows={3}
              placeholder="Was hast du vor dem Abenteurerleben gemacht?"
              className={textareaClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
              Aussehen &amp; besondere Merkmale (körperlich)
            </label>
            <textarea
              value={bioAppearance}
              readOnly={readOnly}
              onChange={(e) => onBioAppearanceChange(e.target.value)}
              rows={4}
              placeholder="Größe, Haare, Narben, Kleidungsstil — nicht Persönlichkeit oder Charakterzüge."
              className={textareaClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold border-b border-hero-dark pb-2">
          Gesinnung
        </h3>
        {alignmentImportedFromFoundry && alignment.trim() ? (
          <p className="font-libre text-xs text-gray-500">
            Aus Foundry übernommen — du kannst sie hier anpassen, wenn sie nicht passt.
          </p>
        ) : null}
        <select
          value={selectedAlignment?.value ?? alignment}
          disabled={readOnly}
          onChange={(e) => onAlignmentChange(e.target.value)}
          className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
        >
          <option value="">— Gesinnung wählen —</option>
          {DND5E_ALIGNMENTS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.labelDe}
            </option>
          ))}
        </select>
        {selectedAlignment ? (
          <p className="font-libre text-sm text-gray-300 leading-relaxed rounded border border-hero-border/40 bg-hero-dark/30 p-3">
            {selectedAlignment.shortDe}
          </p>
        ) : (
          <p className="font-libre text-xs text-gray-500 italic">
            Wähle eine der neun D&amp;D-5e-Gesinnungen — Kurzbeschreibung erscheint hier.
          </p>
        )}
      </section>

      <CharacterFlawSummary characterFlaws={characterFlaws} />

      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-5">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2 border-b border-hero-dark pb-2">
          <Globe className="h-4 w-4" />
          Kultur &amp; Herkunft
        </h3>

        {cultureOptions.length > 0 ? (
          <div>
            <label className="mb-2 block text-xs font-barlow font-bold uppercase text-gray-500">
              Kultur
            </label>
            <div className="flex items-center gap-2">
              <select
                value={cultureLoreId}
                disabled={readOnly}
                onChange={(e) => onCultureChange(e.target.value)}
                className="flex-1 rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
              >
                <option value="">— Keine —</option>
                {cultureOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {cultureLoreId ? (
                <Link
                  href={`/dashboard/campaigns/${campaignId}/lore/${cultureLoreId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded border border-hero-border bg-hero-dark/60 p-2 text-gray-500 hover:text-accent-gold"
                  title="Kultur in der Lore anzeigen"
                >
                  <Info className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <div id="character-sprachen" className="scroll-mt-24">
          <label className="mb-2 flex items-center gap-2 text-xs font-barlow font-bold uppercase text-gray-500">
            Sprachen (Welt-Lore)
          </label>
          {languageOptions.length === 0 ? (
            <p className="font-libre text-sm text-gray-500 italic">
              Für diese Kampagne sind keine freigegebenen Sprachen hinterlegt.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {languageOptions.map((lang) => (
                <label
                  key={lang.id}
                  className={`flex items-center gap-2 rounded border border-hero-border bg-hero-dark/40 px-3 py-2 font-libre text-sm text-gray-200 ${
                    readOnly ? "opacity-80" : "cursor-pointer hover:border-hero-vibrant/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={languages.includes(lang.id)}
                    disabled={readOnly}
                    onChange={() => onToggleLanguage(lang.id)}
                    className="rounded border-hero-dark"
                  />
                  {lang.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {locationOptions.length > 0 ? (
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-barlow font-bold uppercase text-gray-500">
              <MapPin className="h-3.5 w-3.5" />
              Heimatort
            </label>
            <div className="flex items-center gap-2">
              <select
                value={currentLocationId}
                disabled={readOnly}
                onChange={(e) => onCurrentLocationChange(e.target.value)}
                className="flex-1 rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
              >
                <option value="">— Noch nicht gewählt —</option>
                {locationOptions.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.type ? ` (${loc.type})` : ""}
                  </option>
                ))}
              </select>
              {currentLocationId ? (
                <Link
                  href={`/dashboard/campaigns/${campaignId}/lore/${currentLocationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded border border-hero-border bg-hero-dark/60 p-2 text-gray-500 hover:text-accent-gold"
                  title="Ort in der Lore anzeigen"
                >
                  <Info className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
        <div className="border-b border-hero-dark pb-2">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Zustands-Token (KI)
          </h3>
          <p className="mt-1 font-libre text-xs text-gray-500">
            Erstelle aus deinem Basis-Token Varianten für typische Foundry-Zustände. Die KI passt nur
            das Avatarbild an — Identität und Stil bleiben erhalten. Später wechselt der Token auf der
            Karte automatisch je nach Zustand.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CHARACTER_CONDITION_DEFINITIONS.map((def) => {
            const entry = conditionTokens[def.key];
            const isGenerating = generatingKey === def.key && isPending;

            return (
              <div
                key={def.key}
                className="rounded-lg border border-hero-border/50 bg-hero-dark/30 p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-barlow text-xs font-bold uppercase text-white truncate">
                      {def.labelDe}
                    </p>
                    <p className="font-libre text-[10px] text-gray-500">{def.labelEn}</p>
                  </div>
                  {!readOnly ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        title={`KI-Token für ${def.labelDe} erstellen`}
                        disabled={isPending}
                        onClick={() => handleGenerateCondition(def.key)}
                        className="rounded border border-accent-gold/50 bg-accent-gold/10 p-1.5 text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                      {entry ? (
                        <button
                          type="button"
                          title="Token entfernen"
                          disabled={isPending}
                          onClick={() => handleRemoveCondition(def.key)}
                          className="rounded border border-red-900/50 p-1.5 text-red-400 hover:bg-red-900/20 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border border-hero-border bg-hero-dark">
                  {entry?.url ? (
                    <Image
                      src={entry.url}
                      alt={def.labelDe}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-libre text-[9px] text-gray-600 text-center px-1">
                      Noch kein Token
                    </div>
                  )}
                  {entry?.is_ai_generated ? (
                    <span
                      className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 py-0.5"
                      title="KI-generiert"
                    >
                      <Sparkles className="h-2.5 w-2.5 text-accent-gold" />
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
