/** Typ für den zufälligen Lore-Teaser im Dashboard (nicht "use server"). */
export type LoreSnippet = {
  id: string;
  name: string;
  teaser: string;
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

/** Nächste Session für das Dashboard-Widget. */
export type UpcomingSession = {
  id: string;
  title: string | null;
  startTime: string;
  status: string;
  campaignId: string;
  campaignName: string;
  campaignBannerUrl: string | null;
  participants: SessionParticipant[];
};
