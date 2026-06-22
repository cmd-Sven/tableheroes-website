export type EmailNotificationKind =
  | "rsvp_reminder"
  | "news_updates"
  | "profile_messages"
  | "npc_revealed"
  | "faction_revealed"
  | "lore_revealed"
  | "poll_published"
  | "achievements"
  | "points_received"
  | "session_live";

export type EmailNotificationPreferences = {
  /** false = keine E-Mails, unabhängig von den Einzelschaltern */
  master_enabled: boolean;
  rsvp_reminder: boolean;
  news_updates: boolean;
  profile_messages: boolean;
  npc_revealed: boolean;
  faction_revealed: boolean;
  lore_revealed: boolean;
  poll_published: boolean;
  achievements: boolean;
  points_received: boolean;
  session_live: boolean;
};

export const DEFAULT_EMAIL_NOTIFICATION_PREFERENCES: EmailNotificationPreferences = {
  master_enabled: true,
  rsvp_reminder: true,
  news_updates: true,
  profile_messages: true,
  npc_revealed: true,
  faction_revealed: true,
  lore_revealed: true,
  poll_published: true,
  achievements: true,
  points_received: true,
  session_live: true,
};

const PREF_KEYS: EmailNotificationKind[] = [
  "rsvp_reminder",
  "news_updates",
  "profile_messages",
  "npc_revealed",
  "faction_revealed",
  "lore_revealed",
  "poll_published",
  "achievements",
  "points_received",
  "session_live",
];

function readBool(
  source: Record<string, unknown>,
  key: keyof EmailNotificationPreferences,
  fallback: boolean,
): boolean {
  return typeof source[key] === "boolean" ? (source[key] as boolean) : fallback;
}

export function parseEmailNotificationPreferences(
  preferences: unknown,
): EmailNotificationPreferences {
  const root =
    preferences && typeof preferences === "object"
      ? (preferences as Record<string, unknown>)
      : {};
  const email =
    root.email_notifications && typeof root.email_notifications === "object"
      ? (root.email_notifications as Record<string, unknown>)
      : {};

  const defaults = DEFAULT_EMAIL_NOTIFICATION_PREFERENCES;

  return {
    master_enabled: readBool(email, "master_enabled", defaults.master_enabled),
    rsvp_reminder: readBool(email, "rsvp_reminder", defaults.rsvp_reminder),
    news_updates: readBool(email, "news_updates", defaults.news_updates),
    profile_messages: readBool(email, "profile_messages", defaults.profile_messages),
    npc_revealed: readBool(email, "npc_revealed", defaults.npc_revealed),
    faction_revealed: readBool(email, "faction_revealed", defaults.faction_revealed),
    lore_revealed: readBool(email, "lore_revealed", defaults.lore_revealed),
    poll_published: readBool(email, "poll_published", defaults.poll_published),
    achievements: readBool(email, "achievements", defaults.achievements),
    points_received: readBool(email, "points_received", defaults.points_received),
    session_live: readBool(email, "session_live", defaults.session_live),
  };
}

export function mergeEmailNotificationPreferences(
  preferences: unknown,
  patch: Partial<EmailNotificationPreferences>,
): Record<string, unknown> {
  const root =
    preferences && typeof preferences === "object"
      ? { ...(preferences as Record<string, unknown>) }
      : {};

  const current = parseEmailNotificationPreferences(root);
  const next: EmailNotificationPreferences = { ...current, ...patch };

  return {
    ...root,
    email_notifications: next,
  };
}

export function isEmailNotificationEnabled(
  preferences: unknown,
  kind: EmailNotificationKind,
): boolean {
  const parsed = parseEmailNotificationPreferences(preferences);
  if (!parsed.master_enabled) return false;
  return parsed[kind];
}

export const EMAIL_NOTIFICATION_LABELS: Record<
  EmailNotificationKind,
  { title: string; description: string }
> = {
  rsvp_reminder: {
    title: "Anmeldefrist für Termine",
    description:
      "Erinnerung, wenn die RSVP-Frist für eine Session näher rückt und du noch nicht geantwortet hast.",
  },
  news_updates: {
    title: "News & Plattform-Updates",
    description: "Neue veröffentlichte News und Ankündigungen auf Table Heroes.",
  },
  profile_messages: {
    title: "Nachrichten vom Spielleiter",
    description: "E-Mail, wenn dein SL dir eine Nachricht im Posteingang hinterlässt.",
  },
  npc_revealed: {
    title: "Neuer NPC in der Kampagne",
    description: "Benachrichtigung, wenn dein SL einen NPC für die Spielergruppe freigeschaltet hat.",
  },
  faction_revealed: {
    title: "Neue Fraktion in der Kampagne",
    description: "Benachrichtigung bei neu freigeschalteten Fraktionen.",
  },
  lore_revealed: {
    title: "Neuer Lore-Eintrag",
    description: "Benachrichtigung bei neu freigeschalteten Lore-Einträgen und Bestarium-Kreaturen.",
  },
  poll_published: {
    title: "Neue Umfrage",
    description: "Hinweis, wenn in deiner Kampagne eine neue Umfrage veröffentlicht wurde.",
  },
  achievements: {
    title: "Achievement erhalten",
    description: "E-Mail, wenn du ein neues Achievement freigeschaltet hast.",
  },
  points_received: {
    title: "TableHeroes-Punkte erhalten",
    description: "Benachrichtigung, wenn dir Punkte gutgeschrieben wurden (z. B. durch den SL).",
  },
  session_live: {
    title: "Session gestartet",
    description: "Hinweis mit Link, wenn dein SL eine Live-Session gestartet hat.",
  },
};

export { PREF_KEYS as EMAIL_NOTIFICATION_KINDS };
