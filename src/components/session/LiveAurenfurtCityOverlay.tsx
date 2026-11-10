"use client";

import { HoloCityMap } from "@/src/components/city/aurenfurt/HoloCityMap";
import { LiveStageShopOverlay } from "@/src/app/session/[sessionId]/LiveStageShopOverlay";
import type { SessionDayPhase } from "@/src/lib/session-day-phase";

type PartyCharacterOption = {
  id: string;
  name: string;
  playerUserId?: string | null;
  avatarUrl?: string | null;
};

type Props = {
  worldId: string | null;
  campaignId: string;
  sessionId: string;
  isGm: boolean;
  /** Session-Status Scheduled → Vorbereitung, keine Live-Wirkung. */
  isPrepMode?: boolean;
  activeShopId?: string | null;
  activeMerchantNpcId?: string | null;
  shopSellingUnlocked?: boolean;
  characterId?: string | null;
  partyCharacters?: PartyCharacterOption[];
  onOpenShop?: (shopId: string, merchantNpcId: string) => void;
  onCloseShop?: () => void;
  onToggleShopSelling?: (unlocked: boolean) => void;
  onClose?: () => void;
  /** Atmosphäre → optisches Stadtwetter. */
  opticalWeatherPreset?: string | null;
  opticalWeatherIntensity?: number | null;
  sessionDayPhase?: SessionDayPhase | null;
  onSessionNightChange?: (night: boolean) => void;
};

/**
 * Fullscreen Force-View der Aurenfurt-3D-Stadtkarte in der Live Session.
 * Spieler: nur Karte. SL: volle Steuerung inkl. Dashboard/Verwaltung.
 */
export function LiveAurenfurtCityOverlay({
  worldId,
  campaignId,
  sessionId,
  isGm,
  isPrepMode = false,
  activeShopId = null,
  activeMerchantNpcId = null,
  shopSellingUnlocked = false,
  characterId = null,
  partyCharacters = [],
  onOpenShop,
  onCloseShop,
  onToggleShopSelling,
  onClose,
  opticalWeatherPreset = null,
  opticalWeatherIntensity = null,
  sessionDayPhase = null,
  onSessionNightChange,
}: Props) {
  const shopOpen = Boolean(activeShopId);

  return (
    <div
      className={`absolute inset-0 bg-background-dark ${shopOpen ? "z-[110]" : "z-[60]"}`}
      role="dialog"
      aria-label="Aurenfurt Stadtkarte"
    >
      {isPrepMode ? (
        /* Unter der Top-HUD (~108px), damit Kalender/KPIs sichtbar bleiben. */
        <div className="pointer-events-none absolute inset-x-0 top-[112px] z-[55] flex justify-center px-3">
          <div className="max-w-md rounded-md border border-accent-gold/80 bg-background-dark/92 px-3 py-1.5 shadow-lg backdrop-blur-sm">
            <p className="text-center font-barlow text-[11px] font-extrabold uppercase tracking-wide text-accent-gold">
              Vorbereitung — Session noch nicht Live
            </p>
            <p className="text-center font-libre text-[10px] leading-snug text-amber-100/85">
              Stadtereignisse anlegen und auslegen möglich. Kalender und Handel starten erst Live.
            </p>
          </div>
        </div>
      ) : null}

      <HoloCityMap
        worldId={worldId}
        campaignId={campaignId}
        sessionId={sessionId}
        isGm={isGm}
        isPrepMode={isPrepMode}
        playerMapOnly={!isGm}
        showLeave={isGm}
        leaveLabel="Stadtkarte beenden"
        opticalWeatherPreset={opticalWeatherPreset}
        opticalWeatherIntensity={opticalWeatherIntensity}
        sessionDayPhase={sessionDayPhase}
        onSessionNightChange={onSessionNightChange}
        onOpenMerchantShop={onOpenShop}
        partyCharacters={partyCharacters.map((pc) => ({
          id: pc.id,
          name: pc.name,
          imageUrl: pc.avatarUrl ?? null,
          canPlace: isGm || Boolean(characterId && characterId === pc.id),
        }))}
        onLeave={() => {
          if (isGm) onClose?.();
        }}
      />

      {activeShopId ? (
        <div className="pointer-events-auto absolute inset-0 z-[120] bg-background-dark/80">
          <LiveStageShopOverlay
            campaignId={campaignId}
            sessionId={sessionId}
            shopId={activeShopId}
            merchantNpcId={activeMerchantNpcId}
            characterId={characterId}
            isGM={isGm}
            isPrepMode={isPrepMode}
            shopSellingUnlocked={shopSellingUnlocked}
            onToggleShopSelling={onToggleShopSelling}
            partyCharacters={partyCharacters.map((pc) => ({
              id: pc.id,
              name: pc.name,
              playerUserId: pc.playerUserId,
              avatarUrl: pc.avatarUrl,
            }))}
            layout="cityFullscreen"
            onClose={isGm ? onCloseShop : undefined}
          />
        </div>
      ) : null}
    </div>
  );
}
