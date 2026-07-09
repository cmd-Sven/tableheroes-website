"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Shield,
  Skull,
  Heart,
  Archive,
  ArrowRight,
  Trash2,
  Swords,
  Clock,
  Pencil,
  ScrollText,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { deleteCharacter } from "./actions";
import { isDnd5eCampaignSystem } from "@/src/lib/characters/dnd5e/formulas";

export type CharacterCardData = {
  id: string;
  name: string;
  status: string | null;
  level: number;
  class: string;
  race: string;
  biography?: string | null;
  isCampaignLinked?: boolean;
  hasSheet?: boolean;
  canDelete?: boolean;
  deleteBlockedReason?: string | null;
  campaign: {
    id: string;
    name: string;
    system: string | null;
  } | null;
};

type Props = {
  character: CharacterCardData;
  allowDelete?: boolean;
};

function getStatusBadge(
  status: string | null | undefined,
  isCampaignLinked?: boolean,
) {
  const statusValue = status || "Active";
  const isActive = statusValue === "Active";
  const isPending = statusValue === "Pending_Approval";
  const isDead = statusValue === "Dead";
  const isArchived = statusValue === "Archived";

  if (isCampaignLinked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-barlow font-bold uppercase text-xs border bg-hero-vibrant/20 text-hero-vibrant border-hero-vibrant/60">
        <Star className="h-3.5 w-3.5" />
        Aktiver Held
      </span>
    );
  }

  let bgColor = "bg-green-900/30";
  let textColor = "text-green-400";
  let borderColor = "border-green-700";
  let icon = <Heart className="h-3.5 w-3.5" />;
  let label = "Lebend";

  if (isActive) {
    bgColor = "bg-hero-dark/50";
    textColor = "text-hero-vibrant";
    borderColor = "border-hero-border";
    icon = <Swords className="h-3.5 w-3.5" />;
    label = "Aktiv";
  } else if (isPending) {
    bgColor = "bg-amber-900/30";
    textColor = "text-amber-400";
    borderColor = "border-amber-700";
    icon = <Clock className="h-3.5 w-3.5" />;
    label = "Wartet auf Freischaltung";
  } else if (isDead) {
    bgColor = "bg-red-900/30";
    textColor = "text-red-400";
    borderColor = "border-red-700";
    icon = <Skull className="h-3.5 w-3.5" />;
    label = "Tot";
  } else if (isArchived) {
    bgColor = "bg-gray-700/30";
    textColor = "text-gray-400";
    borderColor = "border-gray-600";
    icon = <Archive className="h-3.5 w-3.5" />;
    label = "Archiviert";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-barlow font-bold uppercase text-xs border ${bgColor} ${textColor} ${borderColor}`}
    >
      {icon}
      {label}
    </span>
  );
}

export function CharacterCard({ character, allowDelete = false }: Props) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const status = character.status || "Active";
  const { campaign } = character;
  const isDnd5e = isDnd5eCampaignSystem(campaign?.system);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCharacter(character.id);
      toast.success(
        "Charakter erfolgreich in die Ewigen Jagdgründe geschickt.",
      );
      setDeleteModalOpen(false);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={`rounded-lg border bg-background-card p-6 transition-colors relative ${
          character.isCampaignLinked
            ? "border-hero-vibrant/50 hover:border-hero-vibrant"
            : "border-hero-dark hover:border-hero-vibrant"
        }`}
      >
        {allowDelete && (
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="absolute top-4 right-4 p-1.5 rounded-md bg-black/40 text-gray-300 hover:text-accent-blood hover:bg-black/60 transition-colors"
            title="Charakter löschen"
            aria-label="Charakter löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        <div className="mb-4">
          <div className="flex items-start justify-between mb-2 pr-8 gap-2">
            <h3 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant flex-1">
              {character.name}
            </h3>
            {getStatusBadge(status, character.isCampaignLinked)}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1 rounded bg-hero-dark px-2 py-1 font-barlow font-bold text-xs text-white">
              <Shield className="h-3 w-3 text-accent-gold" />
              Lvl {character.level || 1}
            </span>
            <span className="font-libre text-sm text-gray-300">
              {character.class}
            </span>
            <span className="font-libre text-sm text-gray-400">
              {character.race}
            </span>
            {isDnd5e && character.hasSheet ? (
              <span className="inline-flex items-center gap-1 rounded bg-amber-950/50 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase text-accent-gold border border-amber-800/50">
                <ScrollText className="h-3 w-3" />
                D&amp;D 5e Blatt
              </span>
            ) : null}
          </div>
        </div>

        {campaign && (
          <div className="pt-4 border-t border-hero-border/30">
            <p className="font-libre text-xs text-gray-500 mb-1">
              {character.isCampaignLinked ? "Aktiv in Kampagne:" : "Gespielt in:"}
            </p>
            <Link
              href={`/dashboard/campaigns/${campaign.id}?tab=character`}
              className="inline-flex items-center gap-1.5 font-libre text-sm text-hero-vibrant hover:text-white transition-colors group"
            >
              <span>{campaign.name}</span>
              {campaign.system && (
                <span className="text-gray-500">({campaign.system})</span>
              )}
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        )}

        {character.biography && (
          <div className="pt-4 border-t border-hero-border/30 mt-4">
            <p className="font-libre text-xs text-gray-500 mb-1">
              Hintergrund:
            </p>
            <p className="font-libre text-sm text-gray-400 line-clamp-2">
              {character.biography}
            </p>
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-hero-border/30 flex flex-wrap gap-2">
          <Link
            href={`/dashboard/characters/${character.id}`}
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-xs text-black hover:bg-yellow-500 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Bearbeiten
          </Link>
          {isDnd5e ? (
            <Link
              href={`/dashboard/characters/${character.id}#character-dnd5e-sheet`}
              className="inline-flex items-center gap-2 rounded border border-amber-700/60 bg-amber-950/30 px-4 py-2 font-barlow font-bold uppercase text-xs text-accent-gold hover:bg-amber-950/50 transition-colors"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Datenblatt
            </Link>
          ) : null}
        </div>

        {!allowDelete && character.isCampaignLinked && character.deleteBlockedReason ? (
          <p className="mt-3 font-libre text-xs text-amber-300/90 border-t border-hero-border/20 pt-3">
            {character.deleteBlockedReason}
          </p>
        ) : null}
      </div>

      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-character-title"
        >
          <div className="bg-background-card border border-hero-border rounded-lg shadow-xl max-w-md w-full p-6">
            <h2
              id="delete-character-title"
              className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4"
            >
              Charakter löschen
            </h2>
            <p className="font-libre text-gray-200 leading-relaxed mb-2">
              Möchtest du{" "}
              <strong className="text-hero-vibrant">{character.name}</strong>{" "}
              wirklich dauerhaft löschen? Diese Aktion kann nicht rückgängig
              gemacht werden.
            </p>
            {character.isCampaignLinked && (
              <p className="font-libre text-accent-gold text-sm mb-4">
                Dieser Charakter ist noch mit einer Kampagne verknüpft. Der
                Spielleiter muss ihn zuerst entfernen.
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="font-barlow font-bold uppercase px-4 py-2 rounded border border-hero-border text-gray-300 hover:bg-hero-dark/50 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="font-barlow font-bold uppercase px-4 py-2 rounded bg-accent-blood text-white hover:bg-accent-blood/90 disabled:opacity-50"
              >
                {isDeleting ? "Wird gelöscht…" : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
