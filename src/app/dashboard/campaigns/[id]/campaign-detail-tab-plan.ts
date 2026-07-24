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
  /** Volle NPC/Lore/Fraktion/Quest-Listen — nur Content-Tabs + Settings. */
  needsFullWorldBundle: boolean;
  needsSessionsLightData: boolean;
  needsGmMembers: boolean;
  needsGmPending: boolean;
  needsSessionArchives: boolean;
  needsSessionArchivesFull: boolean;
  needsPlayerCharacter: boolean;
  needsPlayerOverviewExtras: boolean;
  /** Charakter-Editor / Wizard — nicht Overview. */
  needsWizardData: boolean;
  needsPolls: boolean;
  /** Header-Galerie nur auf Overview (sonst leeres Array). */
  needsGallery: boolean;
};

export function buildCampaignDetailLoadPlan(
  tab: CampaignDetailTab,
  isGM: boolean,
  hasAccess: boolean,
): CampaignDetailLoadPlan {
  const playerWithAccess = !isGM && hasAccess;

  // Overview bewusst ohne Full-Bundle: Discoveries laden separat & schlank.
  const needsFullWorldBundle =
    tab === "npcs" ||
    tab === "lore" ||
    tab === "quests" ||
    tab === "settings";

  const needsSessionsLightData = tab === "sessions" && hasAccess;

  const needsGmMembers = isGM && (tab === "members" || tab === "overview" || tab === "quests");

  const needsGmPending = isGM && (tab === "members" || tab === "overview");

  const needsSessionArchives = tab === "sessions" || tab === "overview";
  const needsSessionArchivesFull = tab === "sessions";

  const needsPlayerCharacter =
    playerWithAccess && (tab === "overview" || tab === "character" || tab === "sessions");

  const needsPlayerOverviewExtras = playerWithAccess && tab === "overview";

  const needsWizardData = playerWithAccess && tab === "character";

  const needsPolls = tab === "polls";

  const needsGallery = tab === "overview";

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
    needsGallery,
  };
}
