"use client";

import { useTransition } from "react";
import Link from "next/link";
import { applyToCampaign } from "@/src/app/dashboard/campaigns/[id]/actions";
import { Loader2 } from "lucide-react";

type Props = {
  campaignId: string;
  membershipStatus:
    | "none"
    | "applied"
    | "approved"
    | "active"
    | "rejected"
    | "removed"
    | "drafting"
    | "in_review"
    | "changes_proposed";
  userHasCharacter?: boolean;
  userCharacterName?: string | null;
  characterStatus?: string | null;
};

export function ApplyButton({ campaignId, membershipStatus, userHasCharacter = false, userCharacterName = null, characterStatus = null }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleApply = () => {
    startTransition(async () => {
      try {
        await applyToCampaign(campaignId);
        window.location.reload();
      } catch (error: any) {
        alert(error.message || "Fehler bei der Bewerbung.");
      }
    });
  };

  // Status: None -> Zeige "Jetzt bewerben" Button
  if (membershipStatus === "none") {
    return (
      <div>
        <button
          onClick={handleApply}
          disabled={isPending}
          className="w-full rounded-md border border-hero-border bg-hero-vibrant px-4 py-3 font-barlow font-bold uppercase text-white text-center shadow-lg hover:bg-hero-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Bewerbe...
            </>
          ) : (
            "Jetzt bewerben"
          )}
        </button>
        <p className="mt-2 text-xs font-libre text-gray-400 text-center">
          Bewirb dich für diese Kampagne. Nach der Annahme durch den GM kannst du deinen Charakter erstellen.
        </p>
      </div>
    );
  }

  // Status: Applied -> Zeige Hinweis
  if (membershipStatus === "applied") {
    return (
      <div className="rounded-md border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 text-center">
        <p className="font-barlow font-bold text-sm uppercase text-yellow-400 mb-1">
          Bewerbung läuft...
        </p>
        <p className="font-libre text-xs text-gray-400">
          Deine Bewerbung wird geprüft.
        </p>
      </div>
    );
  }

  // Status: Rejected -> Zeige Hinweis
  if (membershipStatus === "rejected") {
    return (
      <div className="rounded-md border border-red-700/50 bg-red-900/20 px-4 py-3 text-center">
        <p className="font-barlow font-bold text-sm uppercase text-red-400 mb-1">
          Bewerbung abgelehnt
        </p>
        <p className="font-libre text-xs text-gray-400">
          Deine Bewerbung wurde leider nicht angenommen.
        </p>
      </div>
    );
  }

  if (membershipStatus === "removed") {
    return (
      <div className="rounded-md border border-red-700/50 bg-red-900/20 px-4 py-3 text-center">
        <p className="font-barlow font-bold text-sm uppercase text-red-400 mb-1">
          Teilnahme entfernt
        </p>
        <p className="font-libre text-xs text-gray-400">
          Du bist aktuell nicht mehr Teil dieser Kampagne.
        </p>
      </div>
    );
  }

  // Status: In_Review -> Zeige Hinweis (keine Aktion möglich)
  if (membershipStatus === "in_review" || membershipStatus === "changes_proposed") {
    return (
      <div className="rounded-md border border-blue-700/50 bg-blue-900/20 px-4 py-3 text-center">
        <p className="font-barlow font-bold text-sm uppercase text-blue-400 mb-1">
          Charakter wird geprüft
        </p>
        <p className="font-libre text-xs text-gray-400">
          Der GM prüft deinen Charakter-Entwurf.
        </p>
      </div>
    );
  }

  // Status: Drafting -> Zeige Button zum Fortsetzen (wie Accepted ohne Charakter)
  if (membershipStatus === "drafting") {
    return (
      <Link
        href={`/dashboard/campaigns/${campaignId}/character/new`}
        className="block w-full rounded-md border border-hero-border bg-hero-vibrant px-4 py-3 font-barlow font-bold uppercase text-white text-center shadow-lg hover:bg-hero-dark transition-colors"
      >
        Charakterentwurf fortsetzen
      </Link>
    );
  }

  // Status: Approved/Active -> Zeige "Charakter erstellen" oder "Du nimmst teil als..."
  if (membershipStatus === "approved" || membershipStatus === "active") {
    // Allow character creation if:
    // 1. No character exists, OR
    // 2. Character exists but is Dead or Archived
    const canCreateCharacter = !userHasCharacter || (characterStatus === "Dead" || characterStatus === "Archived");
    
    if (canCreateCharacter) {
      return (
        <>
          <Link
            href={`/dashboard/campaigns/${campaignId}/character/new`}
            className="block w-full rounded-md border border-hero-border bg-hero-vibrant px-4 py-3 font-barlow font-bold uppercase text-white text-center shadow-lg hover:bg-hero-dark transition-colors"
          >
            {userHasCharacter && (characterStatus === "Dead" || characterStatus === "Archived")
              ? "Neuen Charakter erstellen"
              : "Charakter erstellen"}
          </Link>
          {userHasCharacter && (characterStatus === "Dead" || characterStatus === "Archived") && (
            <p className="mt-2 text-xs font-libre text-yellow-400 text-center">
              Dein vorheriger Charakter ist {characterStatus === "Dead" ? "verstorben" : "archiviert"}. Du kannst einen neuen erstellen.
            </p>
          )}
        </>
      );
    } else {
      return (
        <div className="rounded-md border border-green-700/50 bg-green-900/20 px-4 py-3 text-center">
          <p className="font-barlow font-bold text-sm uppercase text-green-400 mb-1">
            Du nimmst teil
          </p>
          <p className="font-libre text-sm text-gray-300">
            als <span className="font-semibold text-white">{userCharacterName || "dein Charakter"}</span>
          </p>
        </div>
      );
    }
  }

  return null;
}
