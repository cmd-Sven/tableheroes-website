export type SessionParticipationExtraInput = {
  userId: string;
  points: number;
  reason: string;
};

export type SessionParticipationAchievementInput = {
  userId: string;
  achievementId: string;
};

export type SettleSessionParticipationInput = {
  participantUserIds: string[];
  extras?: SessionParticipationExtraInput[];
  achievements?: SessionParticipationAchievementInput[];
};
