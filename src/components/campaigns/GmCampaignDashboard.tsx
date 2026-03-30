import Link from "next/link";
import {
  Eye,
  EyeOff,
  Shield,
  UserPlus,
  Swords,
  Award,
  Coins,
  BookOpen,
  MessageSquare,
  ExternalLink,
  Plus,
  User,
  Link2,
} from "lucide-react";
import { togglePublishStatus } from "@/src/app/dashboard/campaigns/[id]/campaign-settings-actions";
import { CampaignBroadcastQuickForm } from "./CampaignBroadcastQuickForm";
import { GmTermineSpielplanCard } from "./GmTermineSpielplanCard";
import type {
  GmTermineNextSession,
  GmTerminePlayerRsvp,
} from "./GmTermineSpielplanCard";
import type { RecentLoreSnippet } from "@/src/app/dashboard/campaigns/[id]/lore-queries";

export type GmDashboardCharacterCard = {
  characterId: string;
  name: string;
  classLabel: string;
  race: string;
  level: number;
  username: string;
  /** Gesamtpunkte des Spielers (users.total_points) */
  playerTotalPoints: number;
  playerAvatarUrl: string | null;
};

type Props = {
  campaignId: string;
  campaignName: string;
  isPublished: boolean;
  hasWorld: boolean;
  characters: GmDashboardCharacterCard[];
  recentLore: RecentLoreSnippet[];
  broadcastRecipientCount: number;
  termineSpielplan: {
    campaignId: string;
    nextSession: GmTermineNextSession | null;
    players: GmTerminePlayerRsvp[];
  };
};

const cardClass =
  "rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg";

export function GmCampaignDashboard({
  campaignId,
  campaignName,
  isPublished,
  hasWorld,
  characters,
  recentLore,
  broadcastRecipientCount,
  termineSpielplan,
}: Props) {
  const base = `/dashboard/campaigns/${campaignId}`;
  const marketingCampaignUrl = `/campaigns/${campaignId}`;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Quick Actions */}
        <div className={`${cardClass} xl:col-span-2`}>
          <h2 className="font-barlow font-bold text-xl uppercase text-hero-vibrant tracking-wide mb-4 border-b border-hero-border pb-2">
            Quick Actions
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href={hasWorld ? `${base}/factions/new` : `${base}?tab=npcs`}
              className="flex items-center gap-3 rounded border border-hero-border/40 bg-background-dark px-4 py-3 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant hover:text-white transition-colors"
            >
              <Shield className="h-4 w-4 shrink-0 text-accent-gold" />
              Fraktion erstellen
            </Link>
            <Link
              href={hasWorld ? `${base}/npcs/new` : `${base}?tab=npcs`}
              className="flex items-center gap-3 rounded border border-hero-border/40 bg-background-dark px-4 py-3 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant hover:text-white transition-colors"
            >
              <UserPlus className="h-4 w-4 shrink-0 text-accent-gold" />
              NPC erstellen
            </Link>
            <Link
              href={marketingCampaignUrl}
              className="flex items-center gap-3 rounded border border-hero-border/40 bg-background-dark px-4 py-3 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant hover:text-white transition-colors"
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-accent-gold" />
              Spieler einladen
            </Link>
            <Link
              href={`${base}?tab=members`}
              className="flex items-center gap-3 rounded border border-hero-border/40 bg-background-dark px-4 py-3 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant hover:text-white transition-colors"
            >
              <Coins className="h-4 w-4 shrink-0 text-accent-gold" />
              Punkte vergeben
            </Link>
            <Link
              href={`${base}?tab=members`}
              className="flex items-center gap-3 rounded border border-hero-border/40 bg-background-dark px-4 py-3 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant hover:text-white transition-colors"
            >
              <Award className="h-4 w-4 shrink-0 text-accent-gold" />
              Achievement vergeben
            </Link>
            <Link
              href={`${base}/schedule`}
              className="flex items-center gap-3 rounded border border-hero-border/40 bg-background-dark px-4 py-3 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant hover:text-white transition-colors"
            >
              <Plus className="h-4 w-4 shrink-0 text-accent-gold" />
              Neue Session planen
            </Link>
          </div>
          {!hasWorld && (
            <p className="mt-3 font-libre text-xs text-amber-400/90">
              Ohne zugewiesene Welt: Verknüpfe zuerst eine Welt, damit NPC- und
              Fraktions-Erstellung zuverlässig funktioniert.
            </p>
          )}
        </div>

        {/* Sichtbarkeit */}
        <div className={cardClass}>
          <h2 className="font-barlow font-bold text-lg uppercase text-white mb-3 flex items-center gap-2 border-b border-hero-border pb-2">
            {isPublished ? (
              <Eye className="h-5 w-5 text-green-400" />
            ) : (
              <EyeOff className="h-5 w-5 text-gray-500" />
            )}
            Sichtbarkeit
          </h2>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-barlow font-bold uppercase text-xs mb-3 ${
              isPublished
                ? "bg-green-900/30 text-green-400 border border-green-700"
                : "bg-gray-700/30 text-gray-400 border border-gray-600"
            }`}
          >
            {isPublished ? "Öffentlich" : "Privat"}
          </div>
          <p className="font-libre text-xs text-gray-400 mb-4">
            {isPublished
              ? "Die Kampagne ist auf der Landingpage auffindbar; Spieler können sich bewerben."
              : "Nur du und eingeladene Teilnehmer sehen die Kampagne im Dashboard."}
          </p>
          <form action={togglePublishStatus.bind(null, campaignId, isPublished)}>
            <button
              type="submit"
              className={`w-full rounded-md border px-4 py-2.5 font-barlow font-bold uppercase text-sm transition-colors ${
                isPublished
                  ? "border-gray-600 bg-gray-700 text-white hover:bg-gray-600"
                  : "border-hero-border bg-hero-dark text-white hover:bg-hero-vibrant"
              }`}
            >
              {isPublished ? "Privat schalten" : "Veröffentlichen"}
            </button>
          </form>
        </div>

        <GmTermineSpielplanCard
          campaignId={termineSpielplan.campaignId}
          nextSession={termineSpielplan.nextSession}
          players={termineSpielplan.players}
        />
      </div>

      {/* Spielcharaktere */}
      {characters.length > 0 && (
        <section>
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
            <Swords className="h-6 w-6 text-accent-gold" />
            Spielcharaktere
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((c) => (
              <div key={c.characterId} className={cardClass}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-12 w-12 shrink-0 rounded-full border border-hero-border bg-hero-dark overflow-hidden flex items-center justify-center text-white font-barlow font-bold">
                    {c.playerAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.playerAvatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{c.username[0]?.toUpperCase() ?? "?"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-cinzel font-bold text-lg text-accent-gold truncate">
                      {c.name}
                    </p>
                    <p className="font-libre text-xs text-gray-500">
                      <span className="text-gray-400">{c.username}</span>
                      <span className="text-accent-gold font-barlow font-semibold">
                        {" "}
                        · {c.playerTotalPoints.toLocaleString("de-DE")} Pkt
                      </span>
                    </p>
                    <p className="font-libre text-sm text-gray-400 mt-1">
                      {c.classLabel} · {c.race} · Stufe {c.level}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`${base}/characters/${c.characterId}`}
                    className="inline-flex items-center gap-2 rounded border border-hero-border/50 bg-background-dark px-3 py-2 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-hero-vibrant" />
                    Charakter-Details
                  </Link>
                  <Link
                    href={`${base}/characters/${c.characterId}#gm-character-npc-relations`}
                    className="inline-flex items-center gap-2 rounded border border-hero-border/50 bg-background-dark px-3 py-2 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant transition-colors"
                  >
                    <Link2 className="h-3.5 w-3.5 text-accent-gold" />
                    Beziehungen zu NPCs
                  </Link>
                  <Link
                    href={`${base}/characters/${c.characterId}#gm-character-faction-reputation`}
                    className="inline-flex items-center gap-2 rounded border border-hero-border/50 bg-background-dark px-3 py-2 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant transition-colors"
                  >
                    <Shield className="h-3.5 w-3.5 text-accent-gold" />
                    Fraktionen &amp; Ruf
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Kampagnennachrichten */}
        <div className={cardClass}>
          <h2 className="font-cinzel font-bold text-lg text-accent-gold mb-1 flex items-center gap-2 border-b border-hero-border pb-2">
            <MessageSquare className="h-5 w-5" />
            Kampagnennachrichten
          </h2>
          <p className="font-libre text-sm text-gray-500 mb-4">
            Schneller Rundbrief an alle Teilnehmer von „{campaignName}“.
          </p>
          <CampaignBroadcastQuickForm
            campaignId={campaignId}
            recipientCount={broadcastRecipientCount}
          />
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-1 font-barlow text-xs uppercase text-hero-vibrant hover:text-white transition-colors"
          >
            Zum GM-Dashboard (alle Kampagnen)
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Lore */}
        <div className={cardClass}>
          <div className="flex items-center justify-between border-b border-hero-border pb-2 mb-4">
            <h2 className="font-cinzel font-bold text-lg text-accent-gold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Neueste Lore
            </h2>
            <Link
              href={`${base}?tab=lore`}
              className="font-barlow text-xs uppercase text-hero-vibrant hover:text-white"
            >
              Alle anzeigen
            </Link>
          </div>
          {recentLore.length === 0 ? (
            <p className="font-libre text-sm text-gray-500 italic py-4 text-center">
              {hasWorld
                ? "Noch keine Lore-Einträge in dieser Welt."
                : "Weise der Kampagne eine Welt zu, um Lore zu pflegen."}
            </p>
          ) : (
            <ul className="space-y-3">
              {recentLore.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={`${base}/lore/${entry.id}`}
                    className="block rounded border border-hero-border/30 bg-background-dark p-3 hover:border-accent-gold/40 transition-colors"
                  >
                    <span className="font-barlow font-bold text-sm text-white line-clamp-1">
                      {entry.name}
                    </span>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <span className="font-libre text-xs text-gray-500">
                        {entry.type ?? "Lore"}
                      </span>
                      {entry.created_at && (
                        <span className="font-barlow text-[10px] uppercase text-gray-600">
                          {new Intl.DateTimeFormat("de-DE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(entry.created_at))}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
