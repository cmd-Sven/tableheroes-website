"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { User, Sword, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCharacter } from "@/src/app/dashboard/characters/actions";
import { PrivateInventoryModal } from "@/src/components/inventory/PrivateInventoryModal";

export type HeroSliderCharacter = {
  id: string;
  name: string;
  class: string;
  race: string;
  level?: number;
  avatar_url?: string | null;
  campaignId: string;
  campaignName: string;
  /** Charakter-Status (z. B. Active, Pending_Approval, Dead). Für Lösch-Warnung bei Active. */
  status?: string;
};

/** Zeigt characters.status an; nach GM-Freigabe: Active → Lebend/Aktiv. */
const getStatusLabel = (status?: string): string => {
  switch (status) {
    case "Active":
      return "Lebend/Aktiv";
    case "Pending_Approval":
      return "Wartet auf Freischaltung";
    case "Archived":
      return "Archiviert";
    case "Rejected":
      return "Abgelehnt";
    case "Dead":
      return "Tot";
    case "Draft":
      return "Entwurf";
    case "Approved":
      return "Freigegeben";
    default:
      return status ? String(status) : "Lebend";
  }
};

type Props = {
  characters: HeroSliderCharacter[];
  /** Nur anzeigen, wenn der Nutzer Besitzer ist (z. B. eigenes Dashboard). Auf Profil anderer Nutzer false. */
  allowDelete?: boolean;
};

export function HeroSlider({ characters, allowDelete = false }: Props) {
  const router = useRouter();
  const [deleteModal, setDeleteModal] = useState<HeroSliderCharacter | null>(
    null,
  );
  const [inventoryModal, setInventoryModal] =
    useState<HeroSliderCharacter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    try {
      await deleteCharacter(deleteModal.id);
      toast.success(
        "Charakter erfolgreich in die Ewigen Jagdgründe geschickt.",
      );
      setDeleteModal(null);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (characters.length === 0) return null;

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <Sword className="h-6 w-6 text-accent-gold" />
        Meine Helden
      </h2>
      <div className="overflow-x-auto pb-4 -mx-2 scrollbar-thin scrollbar-thumb-hero-border scrollbar-track-transparent">
        <div className="flex gap-4 min-w-max px-2">
          {characters.map((c) => (
            <div
              key={c.id}
              className="shrink-0 w-[200px] rounded-lg border border-hero-border/40 bg-hero-dark/30 overflow-hidden hover:border-hero-vibrant transition-colors group relative"
            >
              <Link
                href={`/dashboard/campaigns/${c.campaignId}`}
                className="block"
              >
                <div className="relative h-24 bg-hero-dark/50 flex items-center justify-center">
                  {c.avatar_url ? (
                    <Image
                      src={c.avatar_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  ) : (
                    <User className="h-10 w-10 text-accent-gold/40" />
                  )}
                </div>
                <div className="p-3">
                  <p
                    className="font-barlow font-bold text-sm uppercase text-white truncate group-hover:text-hero-vibrant"
                    title={c.name}
                  >
                    {c.name}
                  </p>
                  <p className="font-libre text-xs text-gray-400">
                    {c.class} · {c.race}
                    {c.level != null && c.level > 0 && ` · Stufe ${c.level}`}
                  </p>
                  <p
                    className="font-libre text-xs text-gray-500 mt-1 truncate"
                    title={c.campaignName}
                  >
                    {c.campaignName}
                  </p>
                  <span
                    className="inline-block mt-1 font-libre text-[10px] text-gray-500 bg-hero-dark/40 border border-hero-border/30 rounded px-1.5 py-0.5 truncate max-w-full"
                    title={getStatusLabel(c.status)}
                  >
                    {getStatusLabel(c.status)}
                  </span>
                </div>
              </Link>
              {allowDelete && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setInventoryModal(c);
                    }}
                    className="absolute left-2 top-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-gold"
                    title={`Rucksack von ${c.name} öffnen`}
                    aria-label={`Rucksack von ${c.name} öffnen`}
                  >
                    <Image
                      src="/images/Session_ui/rucksack.png"
                      alt=""
                      width={34}
                      height={34}
                      className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.85)]"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteModal(c);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-gray-300 hover:text-accent-blood hover:bg-black/80 transition-colors"
                    title="Charakter löschen"
                    aria-label="Charakter löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bestätigungs-Dialog */}
      {deleteModal && (
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
              <strong className="text-hero-vibrant">{deleteModal.name}</strong>{" "}
              wirklich dauerhaft löschen? Diese Aktion kann nicht rückgängig
              gemacht werden.
            </p>
            {deleteModal.status === "Active" && (
              <p className="font-libre text-accent-gold text-sm mb-4">
                Dieser Charakter ist Teil einer aktiven Kampagne. Bist du
                sicher?
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
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

      {inventoryModal ? (
        <PrivateInventoryModal
          character={{
            id: inventoryModal.id,
            name: inventoryModal.name,
            class: inventoryModal.class,
            level: inventoryModal.level ?? null,
            avatar_url: inventoryModal.avatar_url ?? null,
          }}
          onClose={() => setInventoryModal(null)}
        />
      ) : null}
    </section>
  );
}
