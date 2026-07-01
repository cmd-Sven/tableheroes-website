export type CampaignDetailTab =
  | "overview"
  | "sessions"
  | "lore"
  | "npcs"
  | "quests"
  | "members"
  | "polls"
  | "character"
  | "settings";

const VALID_TABS: CampaignDetailTab[] = [
  "overview",
  "sessions",
  "lore",
  "npcs",
  "quests",
  "members",
  "polls",
  "character",
  "settings",
];

export function normalizeCampaignDetailTab(tab?: string | null): CampaignDetailTab {
  const value = (tab ?? "overview").toLowerCase();
  return VALID_TABS.includes(value as CampaignDetailTab)
    ? (value as CampaignDetailTab)
    : "overview";
}

export type CampaignDetailLoadPlan = {
  tab: CampaignDetailTab;
  needsFullWorldBundle: boolean;
  needsSessionsLightData: boolean;
  needsGmMembers: boolean;
  needsGmPending: boolean;
  needsSessionArchives: boolean;
  needsSessionArchivesFull: boolean;
  needsPlayerCharacter: boolean;
  needsPlayerOverviewExtras: boolean;
  needsWizardData: boolean;
  needsPolls: boolean;
  needsGallery: boolean;
};

export function buildCampaignDetailLoadPlan(
  tab: CampaignDetailTab,
  isGM: boolean,
  hasAccess: boolean,
): CampaignDetailLoadPlan {
  const playerWithAccess = !isGM && hasAccess;

  const needsFullWorldBundle =
    tab === "npcs" ||
    tab === "lore" ||
    tab === "quests" ||
    tab === "settings" ||
    (playerWithAccess && tab === "overview");

  const needsSessionsLightData = tab === "sessions" && hasAccess;

  const needsGmMembers = isGM && (tab === "members" || tab === "overview" || tab === "quests");

  const needsGmPending = isGM && (tab === "members" || tab === "overview");

  const needsSessionArchives = tab === "sessions" || tab === "overview";
  const needsSessionArchivesFull = tab === "sessions";

  const needsPlayerCharacter =
    playerWithAccess && (tab === "overview" || tab === "character" || tab === "sessions");

  const needsPlayerOverviewExtras = playerWithAccess && tab === "overview";

  const needsWizardData =
    playerWithAccess && (tab === "character" || tab === "overview");

  const needsPolls = tab === "polls";

  return {
    tab,
    needsFullWorldBundle,
    needsSessionsLightData,
    needsGmMembers,
    needsGmPending,
    needsSessionArchives,
    needsSessionArchivesFull,
    needsPlayerCharacter,
    needsPlayerOverviewExtras,
    needsWizardData,
    needsPolls,
    needsGallery: true,
  };
}
