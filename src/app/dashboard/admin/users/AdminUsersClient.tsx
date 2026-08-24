"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  approveUser,
  rejectUser,
  deleteUser,
  setUserPending,
} from "@/src/lib/actions/admin-actions";
import {
  Check,
  X,
  Trash2,
  Shield,
  Crown,
  User as UserIcon,
  Info,
  Swords,
  Star,
  Medal,
} from "lucide-react";
import { toast } from "sonner";

type UserRow = {
  id: string;
  email: string | null;
  username: string | null;
  status: string;
  created_at: string | null;
  primary_role?: string | null;
  role?: string | null;
  experience_level?: string | null;
  previous_games?: string | null;
  motivation?: string | null;
  codex_agreed?: boolean | null;
};

type Props = {
  pendingUsers: UserRow[];
  approvedUsers: UserRow[];
};

function ExperienceBadge({ level }: { level: string | null | undefined }) {
  if (!level) return null;
  if (level === "Neuling") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-700/60 bg-amber-950/30 px-2 py-0.5 text-[10px] font-barlow font-bold uppercase text-amber-400">
        <Swords className="h-3 w-3" /> Neuling
      </span>
    );
  }
  if (level === "Erfahren") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-gray-400/60 bg-gray-700/30 px-2 py-0.5 text-[10px] font-barlow font-bold uppercase text-gray-200">
        <Star className="h-3 w-3" /> Erfahren
      </span>
    );
  }
  if (level === "Veteran") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-accent-gold/60 bg-accent-gold/10 px-2 py-0.5 text-[10px] font-barlow font-bold uppercase text-accent-gold">
        <Medal className="h-3 w-3" /> Veteran
      </span>
    );
  }
  return null;
}

function OnboardingDetailModal({
  user,
  onClose,
}: {
  user: UserRow;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-hero-border bg-background-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-barlow font-bold text-xl text-white uppercase">
            Bewerbung von {user.username || user.email || "Unbekannt"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-white hover:bg-hero-dark transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Experience */}
          <div>
            <p className="font-barlow font-bold text-xs uppercase text-gray-500 mb-1">
              Erfahrungslevel
            </p>
            <ExperienceBadge level={user.experience_level} />
            {!user.experience_level && (
              <span className="font-libre text-sm text-gray-500 italic">
                Nicht angegeben
              </span>
            )}
          </div>

          {/* Previous Games */}
          <div>
            <p className="font-barlow font-bold text-xs uppercase text-gray-500 mb-1">
              Bisherige Spiele
            </p>
            <p className="font-libre text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {user.previous_games || (
                <span className="italic text-gray-500">Nicht angegeben</span>
              )}
            </p>
          </div>

          {/* Motivation */}
          <div>
            <p className="font-barlow font-bold text-xs uppercase text-gray-500 mb-1">
              Motivation
            </p>
            <p className="font-libre text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {user.motivation || (
                <span className="italic text-gray-500">Nicht angegeben</span>
              )}
            </p>
          </div>

          {/* Kodex */}
          <div>
            <p className="font-barlow font-bold text-xs uppercase text-gray-500 mb-1">
              Kodex akzeptiert
            </p>
            <p
              className={`font-barlow font-bold text-sm ${
                user.codex_agreed ? "text-hero-vibrant" : "text-red-400"
              }`}
            >
              {user.codex_agreed ? "Ja" : "Nein"}
            </p>
          </div>

          {/* Registriert am */}
          <div>
            <p className="font-barlow font-bold text-xs uppercase text-gray-500 mb-1">
              Registriert am
            </p>
            <p className="font-libre text-sm text-gray-300">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-border bg-background-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-gray-300 hover:bg-hero-dark transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersClient({ pendingUsers, approvedUsers }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [detailUser, setDetailUser] = React.useState<UserRow | null>(null);

  async function handleApprove(id: string) {
    setLoadingId(id);
    const res = await approveUser(id);
    setLoadingId(null);
    if (res.success) {
      toast.success("Nutzer freigegeben.");
      router.refresh();
    } else toast.error(res.error ?? "Fehler");
  }

  async function handleReject(id: string) {
    const res = await rejectUser(id);
    if (res.success) {
      toast.success("Nutzer abgelehnt.");
      router.refresh();
    } else toast.error(res.error ?? "Fehler");
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Nutzer wirklich endgültig löschen? Profil, Kampagnenmitgliedschaften, Charaktere und der Login (Auth) werden entfernt. Spielleiter/Weltbesitzer können nicht gelöscht werden, solange sie noch Kampagnen/Welten besitzen."
      )
    )
      return;
    setLoadingId(id);
    const res = await deleteUser(id);
    setLoadingId(null);
    if (res.success) {
      toast.success("Nutzer wurde vollständig gelöscht.");
      router.refresh();
    } else {
      toast.error(res.error ?? "Löschen fehlgeschlagen.");
    }
  }

  const totalUsers = pendingUsers.length + approvedUsers.length;

  function getRoleBadge(u: UserRow) {
    const r = (u.role || u.primary_role || "Player") as string;
    if (r === "Admin") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent-gold/60 bg-accent-gold/10 px-2 py-0.5 text-[10px] font-barlow font-bold uppercase text-accent-gold">
          <Crown className="h-3 w-3" /> Admin
        </span>
      );
    }
    if (r === "GameMaster") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-gray-300/60 bg-gray-700/30 px-2 py-0.5 text-[10px] font-barlow font-bold uppercase text-gray-200">
          <Shield className="h-3 w-3" /> GM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/60 bg-blue-900/20 px-2 py-0.5 text-[10px] font-barlow font-bold uppercase text-blue-300">
        <UserIcon className="h-3 w-3" /> Player
      </span>
    );
  }

  return (
    <div className="space-y-8">
      {/* Statistik */}
      <div
        className="rounded-lg border border-hero-border bg-background-card/80 p-4 shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.webp')",
          backgroundSize: "cover",
        }}
      >
        <p className="font-libre text-sm text-gray-200">
          <span className="font-barlow font-bold uppercase text-accent-gold">
            {pendingUsers.length}
          </span>{" "}
          Nutzer warten auf Freigabe{" "}
          <span className="mx-2 text-gray-500">|</span>
          <span className="font-barlow font-bold uppercase text-hero-vibrant">
            {totalUsers}
          </span>{" "}
          Helden insgesamt
        </p>
      </div>

      {/* Sektion 1: Pending */}
      <section
        className="rounded-lg border border-hero-border bg-background-card shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.webp')",
          backgroundSize: "cover",
        }}
      >
        <div className="border-b border-hero-border/70 px-4 py-3">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood">
            Neue Registrierungen
          </h2>
        </div>
        <div className="overflow-x-auto">
          {pendingUsers.length === 0 ? (
            <div className="p-4">
              <p className="font-libre text-sm text-gray-400">
                Keine Nutzer mit Status „pending“.
              </p>
            </div>
          ) : (
            <table className="w-full text-left font-libre text-sm">
              <thead>
                <tr className="border-b border-hero-border bg-hero-dark/30">
                  <th className="px-4 py-3 font-barlow font-bold uppercase text-accent-gold">
                    E-Mail / Name
                  </th>
                  <th className="px-4 py-3 font-barlow font-bold uppercase text-accent-gold">
                    Erfahrung
                  </th>
                  <th className="px-4 py-3 font-barlow font-bold uppercase text-accent-gold">
                    Rolle
                  </th>
                  <th className="px-4 py-3 font-barlow font-bold uppercase text-accent-gold">
                    Registriert
                  </th>
                  <th className="px-4 py-3 font-barlow font-bold uppercase text-accent-gold text-right">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-hero-border/50 hover:bg-hero-dark/10"
                  >
                    <td className="px-4 py-3 text-gray-200">
                      <span className="font-medium">{u.email ?? "—"}</span>
                      {u.username && (
                        <span className="ml-2 text-gray-500">
                          ({u.username})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      <ExperienceBadge level={u.experience_level} />
                      {!u.experience_level && (
                        <span className="text-gray-500 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {getRoleBadge(u)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("de-DE")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailUser(u)}
                          className="inline-flex items-center gap-1 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20"
                          title="Bewerbung ansehen"
                        >
                          <Info className="h-4 w-4" />
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(u.id)}
                          disabled={loadingId === u.id}
                          className="inline-flex items-center gap-1 rounded border border-hero-vibrant bg-hero-vibrant/20 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          Freigeben
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(u.id)}
                          className="inline-flex items-center gap-1 rounded border border-amber-600 bg-amber-900/30 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-amber-400 hover:bg-amber-900/50"
                        >
                          <X className="h-4 w-4" />
                          Ablehnen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          className="inline-flex items-center gap-1 rounded border border-red-800 bg-red-950/30 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-red-400 hover:bg-red-950/50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Sektion 2: Approved */}
      <section
        className="rounded-lg border border-hero-border bg-background-card shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.webp')",
          backgroundSize: "cover",
        }}
      >
        <div className="border-b border-hero-border/70 px-4 py-3">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood">
            Freigebene Helden
          </h2>
        </div>
        <div className="overflow-x-auto">
          {approvedUsers.length === 0 ? (
            <div className="p-4">
              <p className="font-libre text-sm text-gray-400">
                Noch keine freigebenen Nutzer.
              </p>
            </div>
          ) : (
            <table className="w-full text-left font-libre text-sm">
              <thead>
                <tr className="border-b border-hero-border bg-hero-dark/30">
                  <th className="px-4 py-3 font-barlow font-bold uppercase text-accent-gold">
                    E-Mail / Name
                  </th>
                  <th className="px-4 py-3 font-barlow font-bold uppercase text-accent-gold">
                    Rolle
                  </th>
                  <th className="px-4 py-3 font-barlow font-bold uppercase text-accent-gold">
                    Registriert
                  </th>
                  <th className="px-4 py-3 font-barlow font-bold uppercase text-accent-gold text-right">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-hero-border/50 hover:bg-hero-dark/10"
                  >
                    <td className="px-4 py-3 text-gray-200">
                      <span className="font-medium">{u.email ?? "—"}</span>
                      {u.username && (
                        <span className="ml-2 text-gray-500">
                          ({u.username})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {getRoleBadge(u)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("de-DE")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setLoadingId(u.id);
                            const res = await setUserPending(u.id);
                            setLoadingId(null);
                            if (res.success) {
                              toast.success("Nutzer wurde gesperrt (pending).");
                              router.refresh();
                            } else {
                              toast.error(res.error ?? "Fehler");
                            }
                          }}
                          disabled={loadingId === u.id}
                          className="inline-flex items-center gap-1 rounded border border-amber-500 bg-amber-900/30 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-amber-300 hover:bg-amber-900/50 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Sperren
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          className="inline-flex items-center gap-1 rounded border border-red-800 bg-red-950/30 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-red-400 hover:bg-red-950/50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Onboarding-Detail-Modal */}
      {detailUser && (
        <OnboardingDetailModal
          user={detailUser}
          onClose={() => setDetailUser(null)}
        />
      )}
    </div>
  );
}
