"use client";

import Link from "next/link";
import {
  BookOpen,
  Globe,
  Info,
  MapPin,
  User,
  Coins,
} from "lucide-react";
import { CharacterAvatarImage } from "@/src/components/dashboard/player/CharacterAvatarImage";
import { ImageUrlDisplayEditor } from "@/src/components/ui/ImageUrlDisplayEditor";
import type { ImageDisplaySettings } from "@/src/lib/image-display";
import {
  PROFILE_MEDIA_ACCEPT_MIME,
  PROFILE_MEDIA_MAX_BYTES,
  validateProfileImageFile,
} from "@/src/lib/profile-media";
import {
  type CharacterConditionKey,
  type ConditionTokensMap,
} from "@/src/lib/characters/condition-tokens";
import {
  type MoodStateKey,
  type MoodTokensMap,
} from "@/src/lib/characters/mood-states";
import {
  type CharacterFlawEntry,
} from "@/src/lib/characters/character-flaws";
import { CharacterFlawSummary } from "@/src/components/characters/CharacterFlawPicker";
import { CharacterConditionTokensPanel } from "@/src/components/characters/CharacterConditionTokensPanel";
import { CharacterStatesPanel } from "@/src/components/characters/CharacterStatesPanel";
import {
  DND5E_ALIGNMENTS,
  findAlignmentOption,
} from "@/src/lib/characters/dnd5e-alignments";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import {
  filterRacesForCulture,
  formatLoreRaceBonusesForDisplay,
  resolveLoreRaceBonuses,
  resolveLoreRaceDisplayText,
} from "@/src/lib/lore-race-bonuses";

type LanguageOption = { id: string; name: string };
type LocationOption = { id: string; name: string; type?: string };
type CultureOption = {
  id: string;
  name: string;
  race_ids?: string[];
  language_ids?: string[];
  religion_ids?: string[];
};
type RaceOption = {
  id: string;
  name: string;
  culture_id?: string | null;
  race_traits?: string | null;
};
type ReligionOption = { id: string; name: string };

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
  /** Aktueller Rassenname (characters.race / sheet meta) */
  raceName: string;
  onRaceNameChange: (name: string) => void;
  raceOptions: RaceOption[];
  languages: string[];
  onToggleLanguage: (id: string) => void;
  /** Sprachen setzen (z. B. bei Kulturwahl) */
  onLanguagesChange?: (ids: string[]) => void;
  languageOptions: LanguageOption[];
  religionIds: string[];
  onReligionIdsChange: (ids: string[]) => void;
  religionOptions: ReligionOption[];
  currentLocationId: string;
  onCurrentLocationChange: (id: string) => void;
  locationOptions: LocationOption[];
  conditionTokens: ConditionTokensMap;
  onConditionTokensChange: (next: ConditionTokensMap) => void;
  canManageConditionTokens?: boolean;
  isGmViewer?: boolean;
  moodState: MoodStateKey | null;
  moodTokens: MoodTokensMap;
  activeConditions: CharacterConditionKey[];
  onMoodStateChange: (next: MoodStateKey | null) => void;
  onMoodTokensChange: (next: MoodTokensMap) => void;
  onActiveConditionsChange: (next: CharacterConditionKey[]) => void;
  canManageMood?: boolean;
  canManageActiveConditions?: boolean;
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
  raceName,
  onRaceNameChange,
  raceOptions,
  languages,
  onToggleLanguage,
  onLanguagesChange,
  languageOptions,
  religionIds,
  onReligionIdsChange,
  religionOptions,
  currentLocationId,
  onCurrentLocationChange,
  locationOptions,
  conditionTokens,
  onConditionTokensChange,
  canManageConditionTokens = true,
  isGmViewer = false,
  moodState,
  moodTokens,
  activeConditions,
  onMoodStateChange,
  onMoodTokensChange,
  onActiveConditionsChange,
  canManageMood = true,
  canManageActiveConditions = false,
}: CharacterSheetBiographyCultureTabProps) {
  const { t, alignmentLabel, alignmentShort } = useCharacterSheetLocale();
  const portraitPreview = avatarBlobUrl || avatarUrl.trim();
  const tokenPreview = tokenBlobUrl || tokenUrl.trim() || portraitPreview;
  const selectedAlignment = findAlignmentOption(alignment);

  const selectedCulture = cultureOptions.find((c) => c.id === cultureLoreId);
  const racesForCulture = filterRacesForCulture(raceOptions, selectedCulture
    ? {
        id: selectedCulture.id,
        name: selectedCulture.name,
        race_ids: selectedCulture.race_ids ?? [],
      }
    : null);
  const selectedRace = raceOptions.find((r) => r.name === raceName) ?? null;
  const raceBonusLines = formatLoreRaceBonusesForDisplay(
    resolveLoreRaceBonuses({
      raceName,
      raceTraitsRaw: selectedRace?.race_traits,
    }),
  );
  const raceTraitsDescription = resolveLoreRaceDisplayText(selectedRace?.race_traits);
  const religionsForCulture = selectedCulture?.religion_ids?.length
    ? religionOptions.filter((r) => selectedCulture.religion_ids!.includes(r.id))
    : religionOptions.filter((r) => religionIds.includes(r.id));

  const handleCultureSelect = (id: string) => {
    // Side effects (Sprachen, Religion, Rassenfilter) liegen beim Parent
    // (Dnd5eCharacterSheetPanel.applyCultureFromHeader / Creator).
    onCultureChange(id);
  };

  const textareaClass = `w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none ${
    readOnly ? "cursor-default opacity-80" : ""
  }`;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
        <div className="border-b border-hero-dark pb-2">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("biography.portraitToken")}
          </h3>
          <p className="mt-1 font-libre text-xs text-gray-500">
            {t("biography.portraitTokenHint")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Portrait */}
          <div className="space-y-3">
            <label className="block text-xs font-barlow font-bold uppercase text-gray-500">
              {t("field.portrait")}
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
                  {t("biography.noPortrait")}
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
                      {t("biography.removePortrait")}
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
                  placeholder={t("biography.portraitUrl")}
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
              {t("biography.mapToken")}
            </label>
            <div className="flex flex-wrap items-start gap-3">
              {tokenPreview ? (
                <TokenPreview src={tokenPreview} label="Token" className="h-32 w-32 rounded-full" />
              ) : (
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-hero-border/60 bg-hero-dark/40 px-2 text-center font-libre text-[10px] text-gray-500">
                  {t("biography.noToken")}
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
                      {t("biography.copyFromPortrait")}
                    </button>
                  ) : null}
                  {(tokenPreview && (tokenUrl.trim() || tokenBlobUrl)) ? (
                    <button
                      type="button"
                      onClick={onClearToken}
                      className="block text-sm font-libre text-red-400 hover:underline"
                    >
                      {t("biography.removeToken")}
                    </button>
                  ) : null}
                  <p className="font-libre text-[10px] text-gray-500">
                    {t("biography.tokenSizeHint", {
                      mb: Math.round(PROFILE_MEDIA_MAX_BYTES / 1024 / 1024),
                    })}
                  </p>
                </div>
              ) : null}
            </div>
            {!readOnly ? (
              <input
                type="url"
                value={tokenUrl}
                onChange={(e) => onTokenUrlChange(e.target.value)}
                placeholder={t("biography.tokenUrl")}
                className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
              />
            ) : null}
            {!tokenUrl.trim() && !tokenBlobUrl && portraitPreview ? (
              <p className="font-libre text-xs text-gray-500 italic">
                {t("biography.usingPortraitAsToken")}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2 border-b border-hero-dark pb-2">
          <BookOpen className="h-4 w-4" />
          {t("biography.title")}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
              {t("biography.family")}
            </label>
            <textarea
              value={bioFamily}
              readOnly={readOnly}
              onChange={(e) => onBioFamilyChange(e.target.value)}
              rows={3}
              placeholder={t("biography.familyPlaceholder")}
              className={textareaClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
              {t("biography.occupation")}
            </label>
            <textarea
              value={bioOccupation}
              readOnly={readOnly}
              onChange={(e) => onBioOccupationChange(e.target.value)}
              rows={3}
              placeholder={t("biography.occupationPlaceholder")}
              className={textareaClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
              {t("biography.appearance")}
            </label>
            <textarea
              value={bioAppearance}
              readOnly={readOnly}
              onChange={(e) => onBioAppearanceChange(e.target.value)}
              rows={4}
              placeholder={t("biography.appearancePlaceholder")}
              className={textareaClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold border-b border-hero-dark pb-2">
          {t("biography.alignmentTitle")}
        </h3>
        {alignmentImportedFromFoundry && alignment.trim() ? (
          <p className="font-libre text-xs text-gray-500">
            {t("biography.alignmentFoundryHint")}
          </p>
        ) : null}
        {readOnly ? (
          <>
            <p className="font-libre text-sm text-white">
              {alignmentLabel(alignment)}
            </p>
            {selectedAlignment ? (
              <p className="font-libre text-sm text-gray-300 leading-relaxed rounded border border-hero-border/40 bg-hero-dark/30 p-3">
                {alignmentShort(alignment)}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <select
              value={selectedAlignment?.value ?? ""}
              onChange={(e) => onAlignmentChange(e.target.value)}
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
            >
              <option value="">{t("biography.alignmentSelect")}</option>
              {DND5E_ALIGNMENTS.map((a) => (
                <option key={a.value} value={a.value}>
                  {alignmentLabel(a.value)}
                </option>
              ))}
            </select>
            {selectedAlignment ? (
              <p className="font-libre text-sm text-gray-300 leading-relaxed rounded border border-hero-border/40 bg-hero-dark/30 p-3">
                {alignmentShort(alignment)}
              </p>
            ) : (
              <p className="font-libre text-xs text-gray-500 italic">
                {t("biography.alignmentHint")}
              </p>
            )}
          </>
        )}
      </section>

      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-5">
        <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2 border-b border-hero-dark pb-2">
          <Globe className="h-4 w-4" />
          {t("biography.cultureTitle")}
        </h3>

        {cultureOptions.length > 0 ? (
          <div>
            <label className="mb-2 block text-xs font-barlow font-bold uppercase text-gray-500">
              {t("biography.culture")}
            </label>
            <div className="flex items-center gap-2">
              <select
                value={cultureLoreId}
                disabled={readOnly}
                onChange={(e) => handleCultureSelect(e.target.value)}
                className="flex-1 rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
              >
                <option value="">{t("biography.cultureNone")}</option>
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
                  title={t("biography.cultureLoreLink")}
                >
                  <Info className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {raceOptions.length > 0 ? (
          <div>
            <label className="mb-2 block text-xs font-barlow font-bold uppercase text-gray-500">
              {t("biography.race")}
            </label>
            <div className="flex items-center gap-2">
              <select
                value={
                  racesForCulture.some((r) => r.name === raceName) ||
                  raceOptions.some((r) => r.name === raceName)
                    ? raceName
                    : raceName
                      ? "__custom"
                      : ""
                }
                disabled={readOnly}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom") return;
                  onRaceNameChange(v);
                }}
                className="flex-1 rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
              >
                <option value="">{t("biography.raceNone")}</option>
                {(cultureLoreId && racesForCulture.length > 0
                  ? racesForCulture
                  : raceOptions
                )
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                {raceName &&
                !(cultureLoreId && racesForCulture.length > 0
                  ? racesForCulture
                  : raceOptions
                ).some((r) => r.name === raceName) ? (
                  <option value={raceName}>{raceName}</option>
                ) : null}
              </select>
              {selectedRace?.id ? (
                <Link
                  href={`/dashboard/campaigns/${campaignId}/lore/${selectedRace.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded border border-hero-border bg-hero-dark/60 p-2 text-gray-500 hover:text-accent-gold"
                  title={t("biography.raceLoreLink")}
                >
                  <Info className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
            {!readOnly ? (
              <input
                type="text"
                value={raceName}
                onChange={(e) => onRaceNameChange(e.target.value)}
                placeholder={t("biography.raceCustomPlaceholder")}
                className="mt-2 w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
              />
            ) : null}
            {raceTraitsDescription ? (
              <p className="mt-2 rounded border border-hero-border bg-hero-dark/40 p-3 font-libre text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                {raceTraitsDescription}
              </p>
            ) : null}
            {raceBonusLines.length > 0 ? (
              <ul className="mt-2 space-y-1 rounded border border-accent-gold/30 bg-accent-gold/5 p-3 font-libre text-xs text-gray-200 leading-relaxed list-disc pl-5">
                {raceBonusLines.map((line) => (
                  <li key={line.slice(0, 40)}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {religionsForCulture.length > 0 || religionIds.length > 0 ? (
          <div>
            <label className="mb-2 block text-xs font-barlow font-bold uppercase text-gray-500">
              {t("biography.religion")}
            </label>
            <div className="flex flex-wrap gap-2">
              {(religionsForCulture.length > 0 ? religionsForCulture : religionOptions)
                .filter((r) =>
                  religionsForCulture.length > 0
                    ? true
                    : religionIds.includes(r.id) || !readOnly,
                )
                .map((rel) => (
                  <label
                    key={rel.id}
                    className={`flex items-center gap-2 rounded border border-hero-border bg-hero-dark/40 px-3 py-2 font-libre text-sm text-gray-200 ${
                      readOnly ? "opacity-80" : "cursor-pointer hover:border-hero-vibrant/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={religionIds.includes(rel.id)}
                      disabled={readOnly}
                      onChange={() => {
                        if (religionIds.includes(rel.id)) {
                          onReligionIdsChange(religionIds.filter((id) => id !== rel.id));
                        } else {
                          onReligionIdsChange([...religionIds, rel.id]);
                        }
                      }}
                      className="rounded border-hero-dark"
                    />
                    {rel.name}
                  </label>
                ))}
            </div>
          </div>
        ) : null}

        <div id="character-sprachen" className="scroll-mt-24">
          <label className="mb-2 flex items-center gap-2 text-xs font-barlow font-bold uppercase text-gray-500">
            {t("biography.languages")}
          </label>
          {languageOptions.length === 0 ? (
            <p className="font-libre text-sm text-gray-500 italic">
              {t("biography.languagesEmpty")}
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
              {t("biography.homeLocation")}
            </label>
            <div className="flex items-center gap-2">
              <select
                value={currentLocationId}
                disabled={readOnly}
                onChange={(e) => onCurrentLocationChange(e.target.value)}
                className="flex-1 rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
              >
                <option value="">{t("biography.homeLocationNone")}</option>
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
                  title={t("biography.locationLoreLink")}
                >
                  <Info className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <CharacterStatesPanel
        campaignId={campaignId}
        characterId={characterId}
        moodState={moodState}
        moodTokens={moodTokens}
        activeConditions={activeConditions}
        conditionTokens={conditionTokens}
        onMoodStateChange={onMoodStateChange}
        onMoodTokensChange={onMoodTokensChange}
        onActiveConditionsChange={onActiveConditionsChange}
        baseTokenUrl={tokenPreview}
        hasSourceImage={Boolean(portraitPreview || tokenUrl.trim())}
        canManageMood={canManageMood}
        canManageActiveConditions={canManageActiveConditions || isGmViewer}
        isGmViewer={isGmViewer}
      />

      <CharacterConditionTokensPanel
        campaignId={campaignId}
        characterId={characterId}
        conditionTokens={conditionTokens}
        onConditionTokensChange={onConditionTokensChange}
        hasSourceImage={Boolean(portraitPreview || tokenUrl.trim())}
        canManage={canManageConditionTokens}
        isGm={isGmViewer}
      />

      <div className="mx-auto w-full max-w-2xl">
        <CharacterFlawSummary characterFlaws={characterFlaws} />
      </div>
    </div>
  );
}
