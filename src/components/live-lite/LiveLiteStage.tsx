"use client";

/**
 * Spielerfläche der Lite-Bühne: Bilder, Titel, Hintergrund, Würfelanimation.
 * Keine Paletten, keine Würfelauslösung, keine Editoren.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { DiceRollOverlay } from "@/src/components/session/dice/DiceRollOverlay";
import { StageBeastCard } from "@/src/components/session/StageBeastCard";
import { StageSceneCard } from "@/src/components/session/StageSceneCard";
import { StageFactionCard } from "@/src/components/session/live-board/StageFactionCard";
import { StageNpcCard } from "@/src/components/session/live-board/StageNpcCard";
import type { StagePortraitModal } from "@/src/components/session/live-board/live-session-types";
import type { LiteBoardState } from "@/src/lib/live-lite/types";

function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    return null;
  }
  return null;
}

function cssBackgroundImage(url: string): string {
  const escaped = url
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  return `url("${escaped}")`;
}

const noop = () => undefined;

type Props = {
  campaignId: string;
  state: LiteBoardState;
};

export function LiveLiteStage({ campaignId, state }: Props) {
  const [portrait, setPortrait] = useState<StagePortraitModal | null>(null);
  const backgroundUrl = safeImageUrl(state.background?.imageUrl);
  const single = state.items.length === 1;

  return (
    <div className="relative h-full min-h-[70vh] overflow-hidden bg-background-dark">
      <div className="absolute inset-0 bg-background-dark" />
      {backgroundUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: cssBackgroundImage(backgroundUrl) }}
          role="img"
          aria-label={state.background?.name ?? "Ortsbild"}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-background-dark/40" />

      {state.background ? (
        <p className="pointer-events-none absolute left-6 top-6 z-10 font-cinzel text-2xl font-bold text-accent-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          {state.background.name}
        </p>
      ) : null}

      <div className="relative z-10 flex h-full items-center justify-center px-6 py-16">
        {state.items.length === 0 ? (
          <p className="font-cinzel text-xl text-accent-gold/80">Die Bühne ist noch leer.</p>
        ) : (
          <div className="flex max-h-full max-w-full flex-wrap items-center justify-center gap-4">
            <AnimatePresence>
              {state.items.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className={single ? "w-[min(42rem,88vw)]" : "w-[min(18rem,42vw)]"}
                >
                  {item.kind === "npc" ? (
                    <StageNpcCard
                      npc={item.npc}
                      isSingle={single}
                      isGM={false}
                      isCombatMode={false}
                      isInInitiative={false}
                      isUpdating={false}
                      reputationScore={0}
                      reactions={[]}
                      onPortrait={setPortrait}
                      onReaction={noop}
                      onRemove={noop}
                      onToggleShop={noop}
                      onAssignMerchantAndOpen={noop}
                      onDragCombatToken={noop}
                      campaignShops={[]}
                      isShopOpen={false}
                      isShopBusy={false}
                    />
                  ) : null}
                  {item.kind === "beast" ? (
                    <StageBeastCard
                      creature={item.creature}
                      isSingle={single}
                      isGM={false}
                      isUpdating={false}
                      discoveries={{}}
                      onPortrait={setPortrait}
                      onRemove={noop}
                    />
                  ) : null}
                  {item.kind === "scene" ? (
                    <StageSceneCard scene={item.scene} isGM={false} onPortrait={setPortrait} />
                  ) : null}
                  {item.kind === "faction" ? (
                    <StageFactionCard
                      faction={item.faction}
                      isSingle={single}
                      isGM={false}
                      isCombatMode={false}
                      campaignId={campaignId}
                      suppressPlayerNotes
                      onPortrait={setPortrait}
                      onRemove={noop}
                    />
                  ) : null}
                  {item.kind === "location" ? (
                    <LiteLocationCard
                      name={item.location.name}
                      typeLabel={item.location.type}
                      imageUrl={safeImageUrl(item.location.imageUrl)}
                      onPortrait={setPortrait}
                    />
                  ) : null}
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {state.resultLabel ? (
        <div className="pointer-events-none absolute right-6 top-6 z-20 max-w-[min(24rem,40vw)]">
          <p className="rounded-md border border-accent-gold/60 bg-background-dark/85 px-4 py-2 text-right font-cinzel text-lg font-bold text-accent-gold shadow-lg">
            {state.resultLabel}
          </p>
        </div>
      ) : null}

      <DiceRollOverlay logs={state.diceLogs} />

      <AnimatePresence>
        {portrait ? (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute inset-0"
              aria-label="Bild schließen"
              onClick={() => setPortrait(null)}
            />
            <motion.div
              className="relative z-10 max-h-[90vh] max-w-5xl"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Bühnenporträt, gleiche Quelle wie die Karte */}
              <img
                src={portrait.imageUrl}
                alt={portrait.name}
                className="max-h-[80vh] w-auto max-w-full rounded-lg border border-hero-border object-contain"
              />
              <p className="mt-3 text-center font-cinzel text-xl font-bold text-accent-gold">
                {portrait.name}
              </p>
              {portrait.subtitle ? (
                <p className="text-center font-barlow text-sm uppercase tracking-wide text-gray-200">
                  {portrait.subtitle}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setPortrait(null)}
                className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full border border-hero-border bg-background-dark text-gray-200"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function LiteLocationCard({
  name,
  typeLabel,
  imageUrl,
  onPortrait,
}: {
  name: string;
  typeLabel: string | null;
  imageUrl: string | null;
  onPortrait: (portrait: StagePortraitModal) => void;
}) {
  return (
    <motion.div
      className="relative mx-auto w-full max-w-md"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.35 }}
    >
      <button
        type="button"
        onClick={() => {
          if (imageUrl) onPortrait({ name, subtitle: typeLabel, imageUrl });
        }}
        className="group relative block w-full overflow-hidden rounded-xl border-2 border-hero-border/70 bg-background-dark shadow-2xl"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Lore-Ortsbild, gleiche Quelle wie die Karte
          <img
            src={imageUrl}
            alt={name}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-background-dark">
            <span className="font-cinzel text-3xl text-accent-gold">{name.slice(0, 1)}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 py-3 text-left">
          <p className="font-cinzel text-sm font-bold text-white">{name}</p>
          {typeLabel ? (
            <p className="font-barlow text-[10px] uppercase tracking-wide text-accent-gold/90">
              {typeLabel}
            </p>
          ) : null}
        </div>
        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 font-barlow text-[10px] uppercase text-gray-200">
          Ort
        </span>
      </button>
    </motion.div>
  );
}
