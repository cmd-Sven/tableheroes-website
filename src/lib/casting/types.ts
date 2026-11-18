export const CASTING_CALL_SLUG = "call-to-adventure";

export type LandingCastingCall = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  minPlayers: number;
  loggedIn: boolean;
  joined: boolean;
};

export type CastingSignupRow = {
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  dateSent: boolean;
  dateSentAt: string | null;
};

export type CastingAdminState = {
  id: string;
  title: string;
  subtitle: string;
  minPlayers: number;
  isActive: boolean;
  signups: CastingSignupRow[];
};
