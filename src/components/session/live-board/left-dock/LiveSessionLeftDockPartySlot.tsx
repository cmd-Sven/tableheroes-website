/**
 * LiveSessionLeftDockPartySlot — Avatar-tray density, GM Overlord-Cam, and party webcam controls.
 */
"use client";

import {
  Camera,
  CameraOff,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Users,
} from "lucide-react";
import type { PartyTrayMode } from "../LiveSessionPartyTray";
import type { PartyCharacter } from "../live-session-types";
import { usePlayerAvatarCamSessionOptional } from "@/src/components/session/PlayerAvatarCamSessionProvider";
import { useDungeonMasterCamContextOptional } from "@/src/components/session/DungeonMasterCamProvider";

type Props = {
  partyTrayMode: PartyTrayMode;
  onPartyTrayModeChange: (mode: PartyTrayMode) => void;
  isGM: boolean;
  userId: string;
  partyCharacters: PartyCharacter[];
};

function ModeButton({
  active,
  label,
  title,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex flex-1 flex-col items-center gap-1 rounded-md border px-2 py-2.5 font-barlow text-[10px] font-bold uppercase tracking-wide transition-colors ${
        active
          ? "border-accent-gold bg-accent-gold/15 text-accent-gold"
          : "border-hero-border/40 bg-background-dark/70 text-gray-300 hover:border-hero-vibrant/60 hover:text-hero-vibrant"
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export function LiveSessionLeftDockPartySlot({
  partyTrayMode,
  onPartyTrayModeChange,
  isGM,
  userId,
  partyCharacters,
}: Props) {
  const camSession = usePlayerAvatarCamSessionOptional();
  const dmCam = useDungeonMasterCamContextOptional();
  const controllable = partyCharacters.filter((pc) => !pc.isSessionDummy);
  const ownCharacter = controllable.find((pc) => pc.playerUserId === userId) ?? null;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="font-cinzel text-sm font-bold text-accent-gold">Avatar-Leiste</h3>
        <p className="font-libre text-[11px] leading-relaxed text-gray-400">
          Größe der Helden-Leiste unten: voll, kompakt oder ausgeblendet.
        </p>
        <div className="flex gap-2">
          <ModeButton
            active={partyTrayMode === "full"}
            label="Voll"
            title="Volle Avatar-Leiste"
            onClick={() => onPartyTrayModeChange("full")}
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </ModeButton>
          <ModeButton
            active={partyTrayMode === "compact"}
            label="Mini"
            title="Kompakte Avatar-Leiste"
            onClick={() => onPartyTrayModeChange("compact")}
          >
            <Minimize2 className="h-4 w-4" aria-hidden />
          </ModeButton>
          <ModeButton
            active={partyTrayMode === "hidden"}
            label="Aus"
            title="Avatar-Leiste ausblenden"
            onClick={() => onPartyTrayModeChange("hidden")}
          >
            <EyeOff className="h-4 w-4" aria-hidden />
          </ModeButton>
        </div>
      </section>

      {isGM && dmCam?.prefsReady ? (
        <section className="space-y-2">
          <h3 className="font-cinzel text-sm font-bold text-accent-gold">Overlord-Cam</h3>
          <p className="font-libre text-[11px] leading-relaxed text-gray-400">
            Deine Spielleiter-Webcam oben links. Stream bleibt beim Wechsel von Battlemap und
            Bühne erhalten.
          </p>

          <input
            type="text"
            value={dmCam.title}
            onChange={(e) => dmCam.setTitle(e.target.value)}
            maxLength={48}
            aria-label="Cam-Titel"
            placeholder="Overlord"
            className="w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-center font-cinzel text-sm font-bold text-accent-gold outline-none placeholder:text-accent-gold/40 focus:border-hero-vibrant"
          />

          <div className="flex gap-2">
            {dmCam.phase === "active" ? (
              <button
                type="button"
                onClick={dmCam.stopCamera}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-hero-dark/80 bg-background-dark/80 py-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300 hover:border-accent-blood/60 hover:text-red-200"
              >
                <CameraOff className="h-3.5 w-3.5" aria-hidden />
                Stoppen
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  dmCam.setMinimized(false);
                  void dmCam.startCamera();
                }}
                disabled={dmCam.phase === "starting"}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-accent-gold/60 bg-background-card/80 py-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold hover:border-hero-border hover:text-hero-vibrant disabled:opacity-60"
              >
                <Camera className="h-3.5 w-3.5" aria-hidden />
                {dmCam.phase === "starting" ? "Start…" : "Kamera starten"}
              </button>
            )}
            <button
              type="button"
              onClick={() => dmCam.setMinimized(!dmCam.isMinimized)}
              disabled={dmCam.phase !== "active" && !dmCam.isMinimized}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-hero-border/50 bg-background-dark/70 py-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-200 hover:border-accent-gold/60 hover:text-accent-gold disabled:opacity-40"
              title={dmCam.isMinimized ? "Vorschau einblenden" : "Vorschau ausblenden"}
            >
              {dmCam.isMinimized ? (
                <>
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  Einblenden
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  Ausblenden
                </>
              )}
            </button>
          </div>

          {dmCam.errorHint ? (
            <p className="font-libre text-[10px] leading-snug text-red-200/90">{dmCam.errorHint}</p>
          ) : null}

          <p className="font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-500">
            Status:{" "}
            {dmCam.phase === "active"
              ? dmCam.isMinimized
                ? "Aktiv (ausgeblendet)"
                : "Aktiv"
              : dmCam.phase === "starting"
                ? "Startet…"
                : dmCam.phase === "denied" || dmCam.phase === "error"
                  ? "Fehler"
                  : "Aus"}
          </p>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="font-cinzel text-sm font-bold text-accent-gold">Spieler-Webcam</h3>
        <p className="font-libre text-[11px] leading-relaxed text-gray-400">
          Avatar-Bild und Webcam am Charakterportrait umschalten. Gemütszustand ändert nur den
          Token auf der Karte.
        </p>

        {camSession && ownCharacter ? (
          <button
            type="button"
            onClick={() => camSession.toggleCharacterMode(ownCharacter.id)}
            className="flex w-full items-center justify-between gap-2 rounded-md border border-hero-border/50 bg-background-dark/80 px-3 py-2.5 text-left hover:border-accent-gold/60"
          >
            <span className="min-w-0">
              <span className="block truncate font-barlow text-xs font-bold uppercase text-gray-200">
                {ownCharacter.name}
              </span>
              <span className="font-libre text-[10px] text-gray-500">Dein Portrait</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold">
              {camSession.getMode(ownCharacter.id) === "webcam" ? (
                <>
                  <Camera className="h-3.5 w-3.5" aria-hidden />
                  Webcam
                </>
              ) : (
                <>
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  Avatar
                </>
              )}
            </span>
          </button>
        ) : null}

        {isGM && camSession ? (
          <div className="space-y-2 rounded-md border border-amber-900/50 bg-background-dark/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Alle Webcams
              </span>
              <button
                type="button"
                onClick={() => camSession.setAllWebcamsEnabled(!camSession.masterEnabled)}
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                  camSession.masterEnabled
                    ? "border-hero-border/70 text-hero-vibrant hover:border-accent-gold hover:text-accent-gold"
                    : "border-accent-gold/60 text-accent-gold hover:border-hero-border hover:text-hero-vibrant"
                }`}
              >
                {camSession.masterEnabled ? (
                  <>
                    <CameraOff className="h-3.5 w-3.5" aria-hidden />
                    Cams aus
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5" aria-hidden />
                    Cams an
                  </>
                )}
              </button>
            </div>

            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {controllable.length === 0 ? (
                <li className="font-libre text-[11px] text-gray-500">Keine Helden in der Leiste.</li>
              ) : (
                controllable.map((pc) => {
                  const mode = camSession.getMode(pc.id);
                  const webcamOn = mode === "webcam";
                  return (
                    <li key={pc.id}>
                      <button
                        type="button"
                        onClick={() => camSession.toggleCharacterMode(pc.id)}
                        className="flex w-full items-center justify-between gap-2 rounded border border-transparent px-2 py-1.5 text-left hover:border-hero-border/40 hover:bg-background-card/50"
                      >
                        <span className="truncate font-libre text-xs text-gray-200">{pc.name}</span>
                        <span
                          className={`inline-flex items-center gap-1 font-barlow text-[9px] font-bold uppercase ${
                            webcamOn ? "text-hero-vibrant" : "text-gray-500"
                          }`}
                        >
                          {webcamOn ? (
                            <Camera className="h-3 w-3" aria-hidden />
                          ) : (
                            <Users className="h-3 w-3" aria-hidden />
                          )}
                          {webcamOn ? "Cam" : "Avatar"}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}

        {!camSession ? (
          <p className="font-libre text-[11px] text-gray-500">Webcam-Steuerung nicht verfügbar.</p>
        ) : null}
      </section>
    </div>
  );
}
