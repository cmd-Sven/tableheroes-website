"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  User,
  ScrollText,
  CheckCircle,
  Loader2,
  UserPlus,
  XCircle,
} from "lucide-react";
import type { PlayerNpcRequest } from "@/src/types/player-npc-request";
import { approveCharacter } from "@/src/app/dashboard/campaigns/[id]/character-actions";
import {
  acceptApplication,
  rejectApplication,
} from "@/src/app/dashboard/campaigns/[id]/actions";

type PendingCharacter = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  biography: string | null;
  status: string;
  faction_membership: string | null;
  campaign_id: string;
  user_id: string;
  user?: { id: string; username: string } | null;
  player_npc_requests: PlayerNpcRequest[];
};

type PendingApplicationItem = {
  id: string;
  user_id: string;
  username: string | null;
  hasCharacter: boolean;
  application_message: string | null;
};

type Props = {
  campaignId: string;
  pendingApplications: PendingApplicationItem[];
  pendingCharacters: PendingCharacter[];
};

export function GMInboxClient({
  campaignId,
  pendingApplications,
  pendingCharacters,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const handleApproveCharacter = (characterId: string) => {
    startTransition(async () => {
      try {
        await approveCharacter(characterId, campaignId);
        window.location.reload();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Fehler beim Freischalten.");
      }
    });
  };

  const handleAcceptApplication = (memberId: string) => {
    startTransition(async () => {
      try {
        await acceptApplication(memberId, campaignId);
        window.location.reload();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Fehler beim Annehmen.");
      }
    });
  };

  const handleRejectApplication = (memberId: string) => {
    if (!confirm("Bewerbung wirklich ablehnen?")) return;
    startTransition(async () => {
      try {
        await rejectApplication(memberId, campaignId);
        window.location.reload();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Fehler beim Ablehnen.");
      }
    });
  };

  const hasApplications = pendingApplications.length > 0;
  const hasCharacters = pendingCharacters.length > 0;

  return (
    <div className="space-y-10">
      {/* A. Neue Beitritts-Anfragen (campaign_members Applied/Pending) */}
      <section>
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
          <UserPlus className="h-6 w-6" />
          Neue Beitritts-Anfragen
        </h2>
        {!hasApplications ? (
          <div className="rounded-lg border border-hero-dark/50 bg-background-card p-6 text-center">
            <p className="font-libre text-gray-500">
              Keine offenen Beitritts-Anfragen.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {pendingApplications.map((app) => (
              <li
                key={app.id}
                className="rounded-lg border border-hero-border bg-background-card p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <p className="font-barlow font-bold text-white uppercase">
                    {app.username || "Unbekannt"}
                  </p>
                  <p className="font-libre text-sm text-gray-400 mt-1">
                    {app.hasCharacter
                      ? "Hat einen Charakter zur Prüfung eingereicht."
                      : "möchte der Kampagne beitreten (Noch kein Charakter erstellt)"}
                  </p>
                  {app.application_message && (
                    <p className="font-libre text-sm text-gray-500 mt-2 italic line-clamp-2">
                      „{app.application_message}“
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleAcceptApplication(app.id)}
                    className="flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Annehmen
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRejectApplication(app.id)}
                    className="flex items-center gap-2 rounded border border-hero-border bg-background-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-gray-300 hover:bg-red-900/30 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Ablehnen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* B. Charakter-Entwürfe zur Prüfung (characters Pending_Approval) */}
      <section>
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
          <User className="h-6 w-6" />
          Charakter-Entwürfe zur Prüfung
        </h2>
        {!hasCharacters ? (
          <div className="rounded-lg border border-hero-dark/50 bg-background-card p-6 text-center">
            <User className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="font-libre text-gray-500">
              Keine Charaktere warten auf Freigabe (Status Pending_Approval).
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingCharacters.map((char) => (
              <div
                key={char.id}
                className="rounded-lg border border-hero-border bg-background-card p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-cinzel font-bold text-xl text-hero-vibrant flex items-center gap-2">
                      <User className="h-5 w-5 text-accent-gold" />
                      {char.name}
                    </h3>
                    <p className="font-libre text-gray-400 text-sm mt-1">
                      {char.class} · {char.race} · Level {char.level}
                      {char.user?.username && (
                        <span className="ml-2">
                          Spieler: {char.user.username}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleApproveCharacter(char.id)}
                    className="flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Charakter freischalten
                  </button>
                </div>

                {char.biography && (
                  <div className="mb-4">
                    <h4 className="font-barlow font-semibold text-accent-blood border-b border-hero-border pb-2 mb-2">
                      Biografie
                    </h4>
                    <p className="font-libre text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {char.biography}
                    </p>
                  </div>
                )}

                {char.player_npc_requests &&
                  char.player_npc_requests.length > 0 && (
                    <div>
                      <h4 className="font-barlow font-semibold text-accent-blood border-b border-hero-border pb-2 mb-3 flex items-center gap-2">
                        <ScrollText className="h-4 w-4 text-accent-gold" />
                        NPC-Wünsche ({char.player_npc_requests.length})
                      </h4>
                      <ul className="space-y-2">
                        {char.player_npc_requests.map((req) => (
                          <li
                            key={req.id}
                            className="flex items-center justify-between gap-4 rounded border border-hero-dark bg-background-dark p-3"
                          >
                            <div>
                              <span className="font-libre font-semibold text-gray-200">
                                {req.name}
                              </span>
                              <span className="text-gray-500 ml-2">
                                – {req.relationship_type}
                              </span>
                              {req.description && (
                                <p className="font-libre text-sm text-gray-500 mt-1">
                                  {req.description}
                                </p>
                              )}
                            </div>
                            <Link
                              href={`/dashboard/campaigns/${campaignId}/npcs/new?prefill_name=${encodeURIComponent(
                                req.name,
                              )}&prefill_relationship=${encodeURIComponent(
                                req.relationship_type,
                              )}${
                                req.description
                                  ? `&prefill_description=${encodeURIComponent(
                                      req.description,
                                    )}`
                                  : ""
                              }`}
                              className="flex items-center gap-1.5 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              In Wizard übernehmen
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
