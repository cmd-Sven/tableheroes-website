export type SessionType = "GameSession" | "Recruitment" | "Event" | "Planning";

export type ProfileOnlySessionType = "Event" | "Planning" | "Recruitment";

const SESSION_TYPES: SessionType[] = [
  "GameSession",
  "Recruitment",
  "Event",
  "Planning",
];

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  GameSession: "Spielabend",
  Recruitment: "Bewerbungstermin",
  Event: "Event / Stammtisch",
  Planning: "Spielplanung",
};

export function parseSessionType(value: unknown): SessionType {
  if (typeof value === "string" && (SESSION_TYPES as string[]).includes(value)) {
    return value as SessionType;
  }
  return "GameSession";
}

export function getSessionTypeLabel(value: unknown): string {
  return SESSION_TYPE_LABELS[parseSessionType(value)];
}

/** Spielabend: Charakter für RSVP und Live-Bühne erforderlich. */
export function sessionRequiresCharacter(type: unknown): boolean {
  return parseSessionType(type) === "GameSession";
}

/** Live-Bühne, Chronist, Szenen-Vorbereitung — nur Spielabende. */
export function sessionSupportsLiveBoard(type: unknown): boolean {
  return parseSessionType(type) === "GameSession";
}

export function isProfileOnlySessionType(type: unknown): boolean {
  const t = parseSessionType(type);
  return t === "Event" || t === "Planning" || t === "Recruitment";
}

export const CAMPAIGN_EVENT_TYPES: { value: "Planning"; label: string; hint: string }[] = [
  {
    value: "Planning",
    label: "Spielplanung",
    hint: "Organisationstermin zur Vorbereitung der Kampagne — nur für Kampagnenmitglieder.",
  },
];
