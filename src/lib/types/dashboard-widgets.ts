/** Typ für den zufälligen Lore-Teaser im Dashboard (nicht "use server"). */
export type LoreSnippet = {
  id: string;
  name: string;
  teaser: string;
  campaignId: string;
  campaignName: string;
};

/** Zufälliger Welt-Eintrag für "Wissen ist Macht" (Lore, NPC, Fraktion, Ort, Rasse, etc.). */
export type DashboardLoreEntry = {
  id: string;
  name: string;
  imageUrl: string | null;
  type: "lore" | "npc" | "faction";
  campaignId: string;
  campaignName: string;
};

/** Teilnehmer einer Session (Charakter-Daten). */
export type SessionParticipant = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  characterName: string | null;
  characterClass: string | null;
  characterLevel: number | null;
  characterAvatarUrl: string | null;
};

/** RSVP-Status eines Spielers für eine Session. */
export type RsvpStatus = "Zusage" | "Absage" | "Via Online";

/** RSVP eines Spielers (für GM-Ansicht). */
export type SessionRsvp = {
  userId: string;
  username: string;
  characterName: string | null;
  rsvpStatus: RsvpStatus | null;
  gmConfirmed: boolean;
};

/** Nächste Session für das Dashboard-Widget. */
export type UpcomingSession = {
  id: string;
  title: string | null;
  startTime: string;
  endTime?: string | null;
  status: string;
  campaignId: string;
  campaignName: string;
  campaignBannerUrl: string | null;
  participants: SessionParticipant[];
  /** Anmeldefrist in Tagen (1, 2 oder 3). */
  rsvpDeadlineDays: number | null;
  /** true = Live vor Ort, nur 1 Via-Online-Platz. */
  isLive: boolean;
  /** Eigene RSVP des aktuellen Users (Spieler). */
  userRsvp: RsvpStatus | null;
  /** RSVPs aller Kampagnenmitglieder (für GM). */
  rsvps: SessionRsvp[];
  /** Deadline erreicht (heute oder in der Vergangenheit). */
  deadlineReached: boolean;
  /** Bei is_live: true wenn Via-Online-Platz bereits vergeben. */
  viaOnlineTaken: boolean;
  /** Termin-Typ (GameSession, Event, Planning, …). */
  sessionType: string;
  /** false für Event/Planning — RSVP ohne Charakter möglich. */
  requiresCharacter: boolean;
  /** Community-Termin ohne Kampagne (Admin). */
  isCommunityEvent?: boolean;
  communityEventKind?: string;
  location?: string | null;
  /** GM-Spielplanung vor Kampagnenstart — Einladungs-Optik im Dashboard. */
  isPlanningInvitation?: boolean;
};
