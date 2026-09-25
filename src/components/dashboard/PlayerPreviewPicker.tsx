import Link from "next/link";
import Image from "next/image";
import { Eye, Users } from "lucide-react";
import type { PlayerPreviewRow } from "@/src/lib/queries/player-preview-queries";

type Props = {
  players: PlayerPreviewRow[];
};

export function PlayerPreviewPicker({ players }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
            Spieleransicht
          </h1>
          <p className="mt-2 max-w-2xl font-libre text-gray-200 leading-relaxed">
            Wähle einen registrierten Spieler. Danach siehst du das Dashboard so, wie es
            für dieses Konto aussieht.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded border border-accent-gold/80 bg-accent-gold/20 px-3 py-1.5 font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold hover:bg-accent-gold/30"
        >
          Zurück zur SL-Ansicht
        </Link>
      </div>

      {players.length === 0 ? (
        <div className="rounded-md border border-hero-dark bg-background-card p-6">
          <p className="font-libre text-gray-200">Keine registrierten Spieler gefunden.</p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {players.map((player) => (
            <li key={player.id}>
              <Link
                href={`/dashboard?view=player&as=${player.id}`}
                className="flex flex-col gap-4 rounded-md border border-hero-dark bg-background-card p-6 shadow-lg transition-colors hover:border-hero-border sm:flex-row sm:items-start"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-hero-border bg-background-dark">
                    {player.avatarUrl ? (
                      <Image
                        src={player.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center">
                        <Users className="h-6 w-6 text-accent-gold" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-barlow text-xl font-bold uppercase tracking-wide text-white">
                      {player.label}
                    </p>
                    {player.username && player.username !== player.label ? (
                      <p className="font-libre text-sm text-gray-400">@{player.username}</p>
                    ) : null}
                    <div className="mt-3 space-y-2">
                      <p className="font-cinzel text-sm font-bold text-accent-gold">Charaktere</p>
                      {player.characters.length === 0 ? (
                        <p className="font-libre text-sm text-gray-400">Noch kein Charakter.</p>
                      ) : (
                        <ul className="space-y-1">
                          {player.characters.map((character) => (
                            <li key={character.id} className="font-libre text-sm text-gray-200">
                              {character.name}
                              {character.className ? ` · ${character.className}` : ""}
                              {` · Stufe ${character.level}`}
                              {character.campaignName ? ` · ${character.campaignName}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="pt-1 font-cinzel text-sm font-bold text-accent-gold">
                        Aktive Kampagnen
                      </p>
                      {player.campaigns.length === 0 ? (
                        <p className="font-libre text-sm text-gray-400">In keiner Kampagne aktiv.</p>
                      ) : (
                        <p className="font-libre text-sm text-gray-200">
                          {player.campaigns.map((campaign) => campaign.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 self-start rounded border border-hero-border/40 bg-background-dark px-4 py-2.5 font-barlow text-xs font-bold uppercase tracking-wide text-gray-100">
                  <Eye className="h-4 w-4 text-sky-300" />
                  Dashboard öffnen
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
