"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Star,
  Award,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { adjustMemberPoints, type PointLogEntry } from "@/src/lib/actions/point-actions";
import { getAchievementImageSrc } from "@/src/types/achievement";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type MemberDetails = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalPoints: number;
  achievements: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    pointsAwarded: number;
  }>;
  pointsLog: PointLogEntry[];
  nextSessionStatus: "accepted" | "declined" | "pending" | null;
};

type Props = {
  member: MemberDetails;
  campaignId: string;
  onClose: () => void;
};

// ============================================================================
// Component
// ============================================================================

export function MemberDetailManager({ member, campaignId, onClose }: Props) {
  const [pointAmount, setPointAmount] = useState<string>("");
  const [pointReason, setPointReason] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Debug: Log member data on mount
  useEffect(() => {
    console.log("[MemberDetailManager] Initialisiert mit:", {
      username: member.username,
      totalPoints: member.totalPoints,
      achievementsCount: member.achievements.length,
      achievements: member.achievements,
      pointsLogCount: member.pointsLog.length,
      pointsLog: member.pointsLog,
      sessionStatus: member.nextSessionStatus,
    });
  }, [member]);

  function handleAdjustPoints(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(pointAmount, 10);
    if (isNaN(amount) || amount === 0) {
      toast.error("Bitte gib einen gültigen Betrag ein.");
      return;
    }
    if (!pointReason.trim() || pointReason.trim().length < 3) {
      toast.error("Bitte gib einen Grund ein (mind. 3 Zeichen).");
      return;
    }

    startTransition(async () => {
      const result = await adjustMemberPoints(
        member.userId,
        campaignId,
        amount,
        pointReason.trim()
      );
      if (result.success) {
        toast.success(
          `${amount > 0 ? "+" : ""}${amount} Punkte ${amount > 0 ? "vergeben" : "abgezogen"}.`
        );
        setPointAmount("");
        setPointReason("");
        setTimeout(() => window.location.reload(), 800);
      } else {
        toast.error(result.error ?? "Fehler beim Aktualisieren.");
      }
    });
  }

  // Session-Status Icon & Label
  const sessionStatusConfig = {
    accepted: { icon: CheckCircle2, color: "text-green-400", label: "Zugesagt" },
    declined: { icon: XCircle, color: "text-red-400", label: "Abgesagt" },
    pending: { icon: HelpCircle, color: "text-yellow-400", label: "Noch offen" },
  };
  const sessionStatus = member.nextSessionStatus
    ? sessionStatusConfig[member.nextSessionStatus]
    : null;
  const SessionIcon = sessionStatus?.icon;

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg border border-hero-dark bg-background-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-none p-6 border-b border-hero-dark flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-accent-gold/40 bg-black/50">
              {member.avatarUrl ? (
                <Image
                  src={member.avatarUrl}
                  alt={member.username}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center font-barlow font-bold text-lg text-accent-gold">
                  {member.username[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <div>
              <h2 className="font-barlow font-bold text-xl uppercase text-white">
                {member.username}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-barlow text-xs uppercase text-gray-500">
                  Spieler-Details
                </span>
                {sessionStatus && SessionIcon && (
                  <div
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                      sessionStatus.color
                    } ${
                      member.nextSessionStatus === "accepted"
                        ? "border-green-800/50 bg-green-950/20"
                        : member.nextSessionStatus === "declined"
                        ? "border-red-800/50 bg-red-950/20"
                        : "border-yellow-800/50 bg-yellow-950/20"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    <span className="font-barlow text-[10px] font-bold uppercase">
                      {sessionStatus.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-background-dark hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/20">
          {/* Achievements Gallery */}
          <section>
            <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Errungene Achievements
            </h3>
            {member.achievements.length === 0 ? (
              <p className="font-libre text-sm text-gray-500 italic text-center py-4 border border-hero-border/30 rounded bg-background-dark/50">
                Noch keine Achievements freigeschaltet.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {member.achievements.map((ach) => {
                  const src = getAchievementImageSrc(ach.imageUrl);
                  return (
                    <div
                      key={ach.id}
                      className="flex flex-col items-center rounded border border-hero-border/40 bg-hero-dark/30 p-3 hover:border-accent-gold/50 hover:bg-accent-gold/10 transition-all"
                      title={`${ach.name} · +${ach.pointsAwarded} Pkt`}
                    >
                      <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded overflow-hidden bg-hero-dark/50 mb-1">
                        {src ? (
                          <img
                            src={src}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Award className="h-5 w-5 text-accent-gold/70" />
                        )}
                      </div>
                      <span className="text-[10px] text-center line-clamp-2 text-gray-300">
                        {ach.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Points Manager */}
          <section className="rounded-lg border border-accent-gold/20 bg-black/30 p-5">
            <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-4 flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Punkte-Manager
            </h3>

            {/* Current Points */}
            <div className="rounded border border-hero-border/40 bg-hero-dark/30 p-4 mb-4">
              <p className="font-barlow text-xs uppercase text-gray-500 mb-1">
                Aktueller Punktestand
              </p>
              <p className="font-barlow font-extrabold text-3xl text-accent-gold">
                {member.totalPoints.toLocaleString("de-DE")}
              </p>
            </div>

            {/* Adjust Form */}
            <form onSubmit={handleAdjustPoints} className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1">
                    Betrag
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPointAmount((prev) =>
                          prev === "-" ? "" : prev ? `-${prev}` : "-"
                        )
                      }
                      className="rounded border border-red-800/50 bg-red-950/20 px-2 py-2 text-red-400 hover:bg-red-950/40 transition-colors"
                      title="Negativ"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      value={pointAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || val === "-" || /^-?\d+$/.test(val)) {
                          setPointAmount(val);
                        }
                      }}
                      placeholder="z.B. 50"
                      className="flex-1 rounded border border-hero-dark bg-slate-900 px-3 py-2 font-barlow text-white text-center focus:border-hero-vibrant outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPointAmount((prev) =>
                          prev && prev.startsWith("-")
                            ? prev.slice(1)
                            : prev || "+"
                        )
                      }
                      className="rounded border border-green-800/50 bg-green-950/20 px-2 py-2 text-green-400 hover:bg-green-950/40 transition-colors"
                      title="Positiv"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1">
                    Grund
                  </label>
                  <input
                    type="text"
                    value={pointReason}
                    onChange={(e) => setPointReason(e.target.value)}
                    placeholder="z.B. Drachen getötet"
                    maxLength={200}
                    className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending || !pointAmount || !pointReason.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded border border-accent-gold/40 bg-accent-gold/10 px-5 py-2.5 font-barlow font-bold uppercase text-sm text-accent-gold hover:bg-accent-gold/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verarbeite...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4" />
                    Punkte vergeben
                  </>
                )}
              </button>
            </form>

            {/* Points History */}
            <div>
              <p className="font-barlow font-bold text-xs uppercase text-gray-500 mb-2">
                Letzte Transaktionen
              </p>
              {member.pointsLog.length === 0 ? (
                <p className="font-libre text-xs text-gray-600 italic text-center py-3">
                  Keine Historie vorhanden.
                </p>
              ) : (
                <div className="space-y-2">
                  {member.pointsLog.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2 rounded border border-hero-border/20 bg-background-dark/50 p-2.5"
                    >
                      {entry.amount >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-barlow font-bold text-sm ${
                            entry.amount >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {entry.amount >= 0 ? "+" : ""}
                          {entry.amount} Punkte
                        </p>
                        <p className="font-libre text-xs text-gray-400">
                          {entry.reason}
                        </p>
                        <p className="font-barlow text-[10px] text-gray-600 uppercase mt-0.5">
                          {formatDate(entry.createdAt)}
                          {entry.grantedByName && ` · von ${entry.grantedByName}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
