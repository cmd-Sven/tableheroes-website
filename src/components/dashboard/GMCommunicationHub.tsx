"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  Bell,
  Send,
  UserPlus,
  ScrollText,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Users,
  User,
  Scroll,
  ShieldCheck,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import {
  sendMessage,
  type GMNotification,
  type GMRecipientCampaign,
} from "@/src/lib/actions/message-actions";

// ============================================================================
// Types
// ============================================================================

type Props = {
  notifications: GMNotification[];
  recipientCampaigns: GMRecipientCampaign[];
};

// ============================================================================
// Icons für Notification-Typen
// ============================================================================

function NotificationIcon({ type }: { type: GMNotification["type"] }) {
  switch (type) {
    case "application":
      return <UserPlus className="h-4 w-4 text-purple-400" />;
    case "character_update":
      return <ScrollText className="h-4 w-4 text-accent-gold" />;
    case "session_completed":
      return <CheckCircle2 className="h-4 w-4 text-hero-vibrant" />;
    case "chronicle_inbox":
      return <BookOpen className="h-4 w-4 text-sky-300" />;
    default:
      return <Bell className="h-4 w-4 text-gray-400" />;
  }
}

function notificationTypeLabel(type: GMNotification["type"]): string {
  switch (type) {
    case "application":
      return "Bewerbung";
    case "character_update":
      return "Charakter";
    case "session_completed":
      return "Session";
    case "chronicle_inbox":
      return "Chronist";
    default:
      return "System";
  }
}

function notificationTypeBadgeClass(type: GMNotification["type"]): string {
  switch (type) {
    case "application":
      return "bg-purple-900/40 text-purple-300 border-purple-600/40";
    case "character_update":
      return "bg-accent-gold/10 text-accent-gold border-accent-gold/30";
    case "session_completed":
      return "bg-hero-vibrant/10 text-hero-vibrant border-hero-vibrant/30";
    case "chronicle_inbox":
      return "bg-sky-950/40 text-sky-300 border-sky-700/40";
    default:
      return "bg-gray-800/40 text-gray-400 border-gray-600/30";
  }
}

// ============================================================================
// Tab-Button
// ============================================================================

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-t-md px-4 py-2.5 font-barlow font-bold uppercase text-xs transition-colors border-b-2 ${
        active
          ? "border-accent-gold text-accent-gold bg-accent-gold/5"
          : "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600"
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-purple-800/60 px-1.5 py-0.5 font-barlow text-[10px] text-purple-200">
          {badge}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Notifications Tab
// ============================================================================

function NotificationsTab({
  notifications,
}: {
  notifications: GMNotification[];
}) {
  if (notifications.length === 0) {
    return (
      <div className="flex items-center gap-4 p-6">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-hero-border/50 bg-hero-dark/50">
          <ShieldCheck className="h-6 w-6 text-hero-vibrant" />
        </div>
        <div>
          <h3 className="font-cinzel font-bold text-base text-hero-vibrant">
            Alle Reiche sind ruhig
          </h3>
          <p className="font-libre text-sm text-gray-500 mt-0.5">
            Keine neuen System-Meldungen. Genieße die Ruhe, Meister.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-hero-border/10 max-h-[400px] overflow-y-auto">
      {notifications.map((n) => {
        const date = new Intl.DateTimeFormat("de-DE", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(n.createdAt));

        const inner = (
          <div className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors group">
            {n.actorAvatarUrl ? (
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-hero-border/40 bg-background-dark">
                <Image
                  src={n.actorAvatarUrl}
                  alt={n.actorName ?? ""}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hero-border/30 bg-background-dark">
                <NotificationIcon type={n.type} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-barlow text-[10px] uppercase border ${notificationTypeBadgeClass(
                    n.type
                  )}`}
                >
                  <NotificationIcon type={n.type} />
                  {notificationTypeLabel(n.type)}
                </span>
                <span className="font-barlow text-[10px] text-gray-600 uppercase">
                  {date}
                </span>
              </div>
              <p className="font-libre text-sm text-gray-300 leading-snug group-hover:text-white transition-colors">
                {n.message}
              </p>
            </div>

            {n.href ? (
              <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-hero-border/50 bg-background-dark px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase text-gray-300 group-hover:border-accent-gold/50 group-hover:text-accent-gold">
                <ExternalLink className="h-3 w-3" />
                Ansehen
              </span>
            ) : null}
          </div>
        );

        return n.href ? (
          <li key={n.id}>
            <Link href={n.href} className="block">
              {inner}
            </Link>
          </li>
        ) : (
          <li key={n.id}>{inner}</li>
        );
      })}
    </ul>
  );
}

// ============================================================================
// Messenger Tab
// ============================================================================

function MessengerTab({
  recipientCampaigns,
}: {
  recipientCampaigns: GMRecipientCampaign[];
}) {
  const [mode, setMode] = useState<"broadcast" | "direct">("broadcast");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    recipientCampaigns[0]?.id ?? ""
  );
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isHighPriority, setIsHighPriority] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Alle Spieler aus allen Kampagnen (unique by userId)
  const allPlayers = useMemo(() => {
    const map = new Map<
      string,
      { userId: string; username: string; avatarUrl: string | null; campaignName: string }
    >();
    for (const c of recipientCampaigns) {
      for (const m of c.members) {
        if (!map.has(m.userId)) {
          map.set(m.userId, { ...m, campaignName: c.name });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.username.localeCompare(b.username)
    );
  }, [recipientCampaigns]);

  const selectedCampaign = recipientCampaigns.find(
    (c) => c.id === selectedCampaignId
  );

  function handleSend() {
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const priority = isHighPriority ? "high" as const : "normal" as const;

      const result = await sendMessage(
        mode === "broadcast"
          ? {
              type: "broadcast",
              campaignId: selectedCampaignId,
              subject,
              content,
              priority,
            }
          : {
              type: "direct",
              recipientUserId: selectedUserId,
              subject,
              content,
              priority,
            }
      );

      if (result.success) {
        setSuccessMsg(
          mode === "broadcast"
            ? `Nachricht an ${result.count} Spieler gesendet!`
            : "Nachricht gesendet!"
        );
        setSubject("");
        setContent("");
        setIsHighPriority(false);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(result.error);
      }
    });
  }

  const canSend =
    subject.trim().length > 0 &&
    content.trim().length > 0 &&
    (mode === "broadcast" ? !!selectedCampaignId : !!selectedUserId);

  if (recipientCampaigns.length === 0) {
    return (
      <div className="p-6 text-center">
        <Scroll className="mx-auto h-10 w-10 text-gray-600 mb-2" />
        <p className="font-libre text-sm text-gray-500">
          Du leitest aktuell keine Kampagnen mit bestätigten Spielern.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("broadcast")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-barlow font-bold uppercase text-xs transition-colors border ${
            mode === "broadcast"
              ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
              : "border-hero-dark bg-background-dark text-gray-500 hover:text-gray-300"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Kampagnen-Rundbrief
        </button>
        <button
          type="button"
          onClick={() => setMode("direct")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-barlow font-bold uppercase text-xs transition-colors border ${
            mode === "direct"
              ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
              : "border-hero-dark bg-background-dark text-gray-500 hover:text-gray-300"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Einzelner Spieler
        </button>
      </div>

      {/* Empfänger-Auswahl */}
      {mode === "broadcast" ? (
        <div>
          <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1.5">
            Kampagne
          </label>
          <div className="relative">
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full appearance-none rounded border border-hero-dark bg-slate-900 p-2.5 pr-8 font-libre text-sm text-white outline-none transition-colors focus:border-hero-vibrant"
            >
              {recipientCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.members.length}{" "}
                  {c.members.length === 1 ? "Spieler" : "Spieler"})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
          {selectedCampaign && selectedCampaign.members.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <span className="font-barlow text-[10px] uppercase text-gray-600 mr-1">
                Empfänger:
              </span>
              {selectedCampaign.members.slice(0, 8).map((m) => (
                <div
                  key={m.userId}
                  className="h-6 w-6 rounded-full border border-hero-border/40 bg-background-dark overflow-hidden"
                  title={m.username}
                >
                  {m.avatarUrl ? (
                    <Image
                      src={m.avatarUrl}
                      alt={m.username}
                      width={24}
                      height={24}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center font-barlow text-[10px] text-gray-400 font-bold">
                      {m.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {selectedCampaign.members.length > 8 && (
                <span className="font-barlow text-[10px] text-gray-500">
                  +{selectedCampaign.members.length - 8}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1.5">
            Spieler
          </label>
          <div className="relative">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full appearance-none rounded border border-hero-dark bg-slate-900 p-2.5 pr-8 font-libre text-sm text-white outline-none transition-colors focus:border-hero-vibrant"
            >
              <option value="">-- Spieler auswählen --</option>
              {allPlayers.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.username}
                  {p.campaignName ? ` (${p.campaignName})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Betreff */}
      <div>
        <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1.5">
          Betreff
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="z.B. Session-Vorbereitung für nächste Woche"
          className="w-full rounded border border-hero-dark bg-slate-900 p-2.5 font-libre text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-hero-vibrant"
        />
      </div>

      {/* Nachricht */}
      <div>
        <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1.5">
          Nachricht
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Deine Nachricht an die Helden..."
          className="w-full rounded border border-hero-dark bg-slate-900 p-2.5 font-libre text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-hero-vibrant resize-none"
        />
      </div>

      {/* Priority Toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={isHighPriority}
          onChange={(e) => setIsHighPriority(e.target.checked)}
          className="h-4 w-4 rounded border-hero-dark bg-slate-900 text-red-500 accent-red-500"
        />
        <span className="inline-flex items-center gap-1.5 font-barlow font-bold text-xs uppercase text-gray-500 group-hover:text-gray-300 transition-colors">
          <AlertTriangle className={`h-3.5 w-3.5 ${isHighPriority ? "text-red-400" : "text-gray-600"}`} />
          Wichtig
        </span>
        {isHighPriority && (
          <span className="rounded bg-red-900/30 px-1.5 py-0.5 font-barlow text-[10px] text-red-300 border border-red-700/40">
            Hohe Priorität
          </span>
        )}
      </label>

      {/* Error / Success */}
      {error && (
        <div className="rounded border border-red-900/50 bg-red-950/20 px-3 py-2">
          <p className="font-barlow font-bold text-xs text-red-400">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="rounded border border-hero-border/50 bg-hero-vibrant/10 px-3 py-2">
          <p className="font-barlow font-bold text-xs text-hero-vibrant">
            {successMsg}
          </p>
        </div>
      )}

      {/* Send Button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend || isPending}
        className="w-full rounded-md border border-hero-border bg-hero-vibrant px-4 py-3 font-barlow font-bold uppercase text-sm text-white shadow-lg transition-all hover:bg-hero-dark hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Wird gesendet...
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Send className="h-4 w-4" />
            {mode === "broadcast"
              ? "Rundbrief senden"
              : "Nachricht senden"}
          </span>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GMCommunicationHub({
  notifications,
  recipientCampaigns,
}: Props) {
  const [activeTab, setActiveTab] = useState<"notifications" | "messenger">(
    "notifications"
  );

  return (
    <div className="w-full">
      {/* Tab-Header */}
      <div className="flex gap-1 border-b border-hero-border/20 px-4">
        <TabButton
          active={activeTab === "notifications"}
          onClick={() => setActiveTab("notifications")}
          icon={<Bell className="h-3.5 w-3.5" />}
          label="Meldungen"
          badge={notifications.length}
        />
        <TabButton
          active={activeTab === "messenger"}
          onClick={() => setActiveTab("messenger")}
          icon={<Send className="h-3.5 w-3.5" />}
          label="Nachricht senden"
        />
      </div>

      {/* Tab Content */}
      {activeTab === "notifications" ? (
        <NotificationsTab notifications={notifications} />
      ) : (
        <MessengerTab recipientCampaigns={recipientCampaigns} />
      )}
    </div>
  );
}
