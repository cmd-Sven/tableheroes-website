export type EmailNotificationKind = "rsvp_reminder" | "news_updates" | "profile_messages";

export type EmailNotificationPreferences = {
  rsvp_reminder: boolean;
  news_updates: boolean;
  profile_messages: boolean;
};

export const DEFAULT_EMAIL_NOTIFICATION_PREFERENCES: EmailNotificationPreferences = {
  rsvp_reminder: true,
  news_updates: true,
  profile_messages: true,
};

const PREF_KEYS: EmailNotificationKind[] = [
  "rsvp_reminder",
  "news_updates",
  "profile_messages",
];

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

  return {
    rsvp_reminder:
      typeof email.rsvp_reminder === "boolean"
        ? email.rsvp_reminder
        : DEFAULT_EMAIL_NOTIFICATION_PREFERENCES.rsvp_reminder,
    news_updates:
      typeof email.news_updates === "boolean"
        ? email.news_updates
        : DEFAULT_EMAIL_NOTIFICATION_PREFERENCES.news_updates,
    profile_messages:
      typeof email.profile_messages === "boolean"
        ? email.profile_messages
        : DEFAULT_EMAIL_NOTIFICATION_PREFERENCES.profile_messages,
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
  return parseEmailNotificationPreferences(preferences)[kind];
}

export const EMAIL_NOTIFICATION_LABELS: Record<
  EmailNotificationKind,
  { title: string; description: string }
> = {
  rsvp_reminder: {
    title: "Anmeldefrist für Termine",
    description:
      "Erinnerung per E-Mail, wenn die RSVP-Frist für eine Session näher rückt und du noch nicht zugesagt hast.",
  },
  news_updates: {
    title: "News & Updates",
    description:
      "Benachrichtigung, wenn neue veröffentlichte News oder Plattform-Updates für dich bereitstehen.",
  },
  profile_messages: {
    title: "Nachrichten im Profil",
    description:
      "E-Mail, wenn dein Spielleiter dir eine neue Nachricht im Posteingang hinterlassen hat.",
  },
};

export { PREF_KEYS as EMAIL_NOTIFICATION_KINDS };
