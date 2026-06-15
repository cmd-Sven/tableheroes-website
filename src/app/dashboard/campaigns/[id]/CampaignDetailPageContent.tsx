import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Users,
  MapPin,
  Settings,
  Store,
  User,
} from "lucide-react";
import { GmCampaignDashboard } from "@/src/components/campaigns/GmCampaignDashboard";
import {
  togglePublishStatus,
  updateCampaignDetails,
} from "./campaign-settings-actions";
import { MembersManagement } from "./MembersManagement";
import { GroupRewardForm } from "@/src/components/campaigns/GroupRewardForm";
import { isLocationType, TYPE_MAPPING } from "@/src/lib/lore-types";
import { NPCsManagement } from "./NPCsManagement";
import { FactionsManagement } from "./FactionsManagement";
import { LoreManagement } from "./LoreManagement";
import { QuestLogManagement } from "./QuestLogManagement";
import { SessionsTab } from "./SessionsTab";
import { CharacterCreatorButton } from "./CharacterCreatorButton";
import { CinematicCampaignHeader } from "@/src/components/dashboard/campaigns/CinematicCampaignHeader";
import { CampaignDescriptionEditor } from "@/src/components/campaigns/CampaignDescriptionEditor";
import { CampaignScheduleForm } from "@/src/components/dashboard/campaigns/CampaignScheduleForm";
import { CampaignDiscordSettings } from "@/src/components/dashboard/campaigns/CampaignDiscordSettings";
import type { CampaignDiscordSettings as CampaignDiscordSettingsData } from "@/src/app/dashboard/campaigns/[id]/campaign-discord-actions";
import { WorldRequiredBlocker } from "@/src/components/dashboard/campaigns/world/WorldRequiredBlocker";
import { OnboardingSettings } from "@/src/components/dashboard/campaigns/OnboardingSettings";
import { ApplyToCampaignBlock } from "./ApplyToCampaignBlock";
import { DiscoverySlider } from "@/src/components/dashboard/player/DiscoverySlider";
import { PartyOverview } from "@/src/components/dashboard/player/PartyOverview";
import { PlayerCampaignCharacterOverview } from "@/src/components/dashboard/player/PlayerCampaignCharacterOverview";
import { PlayerCampaignNextSession } from "@/src/components/dashboard/player/PlayerCampaignNextSession";
import { LastSessionRecapCard } from "@/src/components/chronicle/LastSessionRecapCard";
import { PlayerRsvpDeadlineBanner } from "@/src/components/dashboard/player/PlayerRsvpDeadlineBanner";
import { MyCharacterSection } from "@/src/components/dashboard/player/MyCharacterSection";
import { CampaignSessionLandingVisibility } from "./CampaignSessionLandingVisibility";
import type { CampaignDetailPageData } from "./campaign-detail-load";
import { sessionRequiresCharacter } from "@/src/lib/session-type";

export function CampaignDetailPageContent({
  campaignId,
  tab,
  data,
  discordSettings,
}: {
  campaignId: string;
  tab: string;
  data: CampaignDetailPageData;
  discordSettings: CampaignDiscordSettingsData | null;
}) {
  const id = campaignId;
  const {
    campaign,
    world,
    gmWorlds,
    campaignWorldId,
    isGM,
    currentUserId,
    userMembershipStatus,
    userHasCharacter,
    isDeadOrArchived,
    membership,
    hasAccess,
    gmSessionRsvpRows,
    sessions,
    upcomingSessions,
    upcomingSessionsWithRsvp,
    focusSession,
    otherUpcomingSessions,
    pastSessionsForCampaignTab,
    sessionArchives,
    latestPublishedPlayerRecap,
    now,
    npcs,
    factions,
    loreEntries,
    quests,
    pendingApplications,
    draftingMembers,
    inReviewMembers,
    acceptedMembers,
    pendingCount,
    acceptedMembersCount,
    gmDashboardCharacters,
    gmRecentLore,
    gmBroadcastRecipientCount,
    gmTermineSpielplan,
    myCharacter,
    myCharacterForClient,
    allDiscoveries,
    party,
    playerNextSessionData,
    galleryImages,
    wizardFactions,
    wizardLocations,
    wizardCultures,
    wizardLanguages,
    characterReputations,
    lastPlayerAchievement,
  } = data;

  /** Nach serializeForClient kann `now` ISO-String statt Date sein */
  const nowMs =
    typeof now === "string"
      ? new Date(now).getTime()
      : now instanceof Date
        ? now.getTime()
        : Date.now();

  /** DB-Status: Approved / Active (nicht mehr „Accepted“). Drafting = Entwurf fortsetzen. */
  const canShowPlayerCharacterCreator =
    userMembershipStatus === "Drafting" ||
    ((userMembershipStatus === "Approved" || userMembershipStatus === "Active") &&
      (!userHasCharacter || isDeadOrArchived));

  const OverviewTab = (
    <div className="space-y-8">
      {isGM && (
        <GmCampaignDashboard
          campaignId={id}
          campaignName={campaign.name ?? "Kampagne"}
          isPublished={!!campaign.is_published}
          hasWorld={!!campaignWorldId}
          characters={gmDashboardCharacters}
          recentLore={gmRecentLore}
          broadcastRecipientCount={gmBroadcastRecipientCount}
          termineSpielplan={gmTermineSpielplan}
        />
      )}
      <div className="grid gap-8 lg:grid-cols-3">
      {/* Left Column (Main Content) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Apply to Campaign (when not yet a member) */}
        {!isGM && userMembershipStatus === "none" && (
          <ApplyToCampaignBlock campaignId={id} />
        )}

        {/* Charakter erstellen / Entwurf (Approved, Active oder Drafting) */}
        {!isGM && canShowPlayerCharacterCreator && (
            <div className="rounded-lg border border-hero-vibrant bg-linear-to-br from-hero-dark/50 to-background-card p-6">
              <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-border pb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-accent-gold" />
                {userMembershipStatus === "Drafting"
                  ? "Charakterentwurf fortsetzen"
                  : "Charakter erstellen"}
              </h2>
              <p className="font-libre text-gray-300 mb-4">
                {userMembershipStatus === "Drafting"
                  ? "Setze deinen Charakterentwurf fort und vervollständige ihn."
                  : "Du wurdest als Spieler akzeptiert! Erstelle jetzt deinen Charakter für diese Kampagne."}
              </p>
              <CharacterCreatorButton campaignId={id} />
            </div>
          )}

        {/* Character Sheet Link (if user has character) */}
        {!isGM && userHasCharacter && myCharacter && (
          <div className="rounded-lg border border-hero-vibrant bg-linear-to-br from-hero-dark/50 to-background-card p-6">
            {(myCharacter as any).status === "Pending_Approval" && (
              <div className="mb-4 rounded border border-accent-gold/50 bg-accent-gold/10 p-3">
                <p className="font-libre text-sm text-accent-gold">
                  Dein Charakter wird vom Spielleiter geprüft. Du kannst erst an
                  Sessions teilnehmen, wenn er freigeschaltet ist.
                </p>
              </div>
            )}
            <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-border pb-2 flex items-center gap-2">
              <User className="h-5 w-5 text-accent-gold" />
              Mein Charakter
            </h2>
            <p className="font-libre text-gray-300 mb-4">
              Du spielst als{" "}
              <span className="text-hero-vibrant font-semibold">
                {myCharacter.name}
              </span>{" "}
              ({myCharacter.class}, Level {myCharacter.level}).
            </p>
            <Link
              href={`/dashboard/campaigns/${id}?tab=character`}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors"
            >
              <User className="h-4 w-4" />
              Charakter anzeigen
            </Link>
          </div>
        )}

        {/* Membership Status Messages (for non-GM users) */}
        {!isGM &&
          userMembershipStatus !== "none" &&
          !["Approved", "Active"].includes(String(userMembershipStatus)) && (
            <div className="rounded-lg border border-hero-dark bg-background-card p-6">
              <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-dark pb-2">
                Bewerbungsstatus
              </h2>
              {userMembershipStatus === "Applied" ? (
                <p className="font-libre text-gray-300">
                  <span className="text-accent-gold font-semibold">
                    Bewerbung läuft...
                  </span>{" "}
                  Der Spielleiter prüft deine Bewerbung.
                </p>
              ) : userMembershipStatus === "Rejected" ? (
                <p className="font-libre text-gray-300">
                  <span className="text-red-400 font-semibold">
                    Bewerbung abgelehnt.
                  </span>
                </p>
              ) : userMembershipStatus === "In_Review" ? (
                <p className="font-libre text-gray-300">
                  <span className="text-yellow-400 font-semibold">
                    Charakter wird geprüft.
                  </span>
                </p>
              ) : null}
            </div>
          )}

        {/* Description – GM gets Rich-Text Editor, Players get rendered HTML */}
        {isGM ? (
          <CampaignDescriptionEditor
            campaignId={id}
            initialContent={campaign.description || ""}
          />
        ) : (
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-dark pb-2">
              Beschreibung
            </h2>
            {campaign.description ? (
              <div
                className="campaign-description-prose font-libre text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: campaign.description }}
              />
            ) : (
              <p className="font-libre text-gray-500 italic">
                Keine Beschreibung vorhanden.
              </p>
            )}
          </div>
        )}

        {/* Campaign Details bearbeiten (GM Only) */}
        {isGM && (
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-dark pb-2 flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent-gold" />
              Details bearbeiten
            </h2>
            <form
              action={updateCampaignDetails.bind(null, id)}
              className="space-y-4"
              suppressHydrationWarning={true}
            >
              {/* Kampagnenname */}
              <div>
                <label
                  htmlFor="name"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Kampagnenname *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={campaign.name || ""}
                  placeholder="z.B. Zeitalter der Wiedergeburt"
                  required
                  minLength={2}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>
              {/* Banner Image */}
              <div>
                <label
                  htmlFor="banner_url"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Banner Bild URL
                </label>
                <input
                  type="url"
                  id="banner_url"
                  name="banner_url"
                  defaultValue={campaign.banner_url || ""}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
                <p className="mt-1 font-libre text-xs text-gray-500">
                  Wird auf der öffentlichen Kampagnenseite als Hero-Banner
                  verwendet.
                </p>
              </div>

              {/* Looking For */}
              <div>
                <label
                  htmlFor="looking_for"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Gesucht wird
                </label>
                <input
                  type="text"
                  id="looking_for"
                  name="looking_for"
                  defaultValue={campaign.looking_for || ""}
                  placeholder="z.B. Noch 1 Heiler und 1 Face"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* House Rules */}
              <div>
                <label
                  htmlFor="house_rules"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Hausregeln
                </label>
                <textarea
                  id="house_rules"
                  name="house_rules"
                  defaultValue={campaign.house_rules || ""}
                  rows={4}
                  placeholder="z.B. Keine bösen Charaktere, Homebrew erlaubt nach Absprache"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none resize-none"
                  suppressHydrationWarning={true}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full rounded border border-hero-border bg-hero-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors"
                suppressHydrationWarning={true}
              >
                Speichern
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right Column (Sidebar/Tools) */}
      <div className="space-y-6">
        {isGM && (
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-barlow font-bold text-lg text-white uppercase mb-3 flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent-gold" />
              Mehr
            </h3>
            <Link
              href={`/dashboard/campaigns/${id}?tab=settings`}
              className="flex w-full items-center rounded border border-hero-border/30 bg-background-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-gray-300 hover:border-hero-vibrant hover:text-white transition-colors"
            >
              <Settings className="inline h-4 w-4 mr-2" />
              Einstellungen
            </Link>
            <Link
              href={`/dashboard/campaigns/${id}/shops`}
              className="mt-2 flex w-full items-center rounded border border-hero-border/30 bg-background-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-gray-300 hover:border-hero-vibrant hover:text-white transition-colors"
            >
              <Store className="inline h-4 w-4 mr-2" />
              Shops und Handel
            </Link>
            <p className="mt-3 font-libre text-xs text-gray-500">
              Spielplan, Onboarding und Sichtbarkeit findest du auch unter
              Einstellungen sowie unter{" "}
              <Link
                href={`/dashboard/campaigns/${id}/schedule`}
                className="text-hero-vibrant hover:underline"
              >
                Termine &amp; Spielplan
              </Link>
              .
            </p>
          </div>
        )}

        {/* Player View: Link zum Spieler-Dashboard */}
        {!isGM && (
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-3">
              Du bist Spieler
            </h3>
            <p className="font-libre text-sm text-gray-400 mb-4">
              Als Spieler kannst du die Kampagnendetails einsehen, aber keine
              Änderungen vornehmen.
            </p>
            <Link
              href={`/dashboard/campaigns/${id}/player-dashboard`}
              className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark/50 px-4 py-2.5 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-dark transition-colors"
            >
              <User className="h-4 w-4" />
              Mein Kampagnen-Dashboard
            </Link>
          </div>
        )}
      </div>
      </div>
    </div>
  );

  const sessionsTabNpcs = (npcs || []).map((n: any) => ({
    id: String(n.id),
    name: String(n.name ?? ""),
    title: n.title != null ? String(n.title) : null,
  }));

  const SessionsTabContent = (
    <SessionsTab
      campaignId={id}
      worldId={campaignWorldId ?? null}
      isGM={isGM}
      characterStatus={!isGM ? (myCharacter as any)?.status : undefined}
      focusSession={(focusSession as any) ?? null}
      otherUpcomingSessions={(otherUpcomingSessions || []) as any}
      pastSessionRows={(pastSessionsForCampaignTab || []) as any}
      upcomingSessions={(upcomingSessionsWithRsvp || []) as any}
      archives={(sessionArchives || []) as any}
      latestPublishedPlayerRecap={latestPublishedPlayerRecap}
      locations={loreEntries
        .filter((l: any) => isLocationType(l.type))
        .map((l: any) => ({ id: String(l.id), name: String(l.name ?? ""), type: String(l.type ?? "") }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))}
      npcs={sessionsTabNpcs}
    />
  );

  const NPCsTab = !campaignWorldId ? (
    <WorldRequiredBlocker campaignId={id} isGM={isGM} worlds={gmWorlds} />
  ) : (
    <NPCsManagement
      campaignId={id}
      worldId={campaignWorldId ?? undefined}
      npcs={npcs}
      factions={factions}
      isGM={isGM}
    />
  );

  const FactionsTab = !campaignWorldId ? (
    <WorldRequiredBlocker campaignId={id} isGM={isGM} worlds={gmWorlds} />
  ) : (
    <FactionsManagement
      campaignId={id}
      worldId={campaignWorldId ?? undefined}
      factions={factions}
      npcs={npcs}
      isGM={isGM}
    />
  );

  const LoreTab = !campaignWorldId ? (
    <WorldRequiredBlocker campaignId={id} isGM={isGM} worlds={gmWorlds} />
  ) : (
    <LoreManagement campaignId={id} worldId={campaignWorldId ?? undefined} loreEntries={loreEntries} isGM={isGM} />
  );

  // Extract characters from accepted members for personal quests
  const availableCharacters = acceptedMembers
    .filter((m: any) => m.character_data && m.character_data.status === "Active")
    .map((m: any) => ({
      id: m.character_data.id,
      name: m.character_data.name,
      class: m.character_data.class,
      race: m.character_data.race,
      level: m.character_data.level || 1,
    }));

  const QuestTab = (
    <QuestLogManagement
      campaignId={id}
      quests={quests}
      npcs={npcs.map((npc: any) => ({
        id: npc.id,
        name: npc.name,
        title: npc.title,
        role: npc.role,
      }))}
      locations={loreEntries
        .filter((l: any) => isLocationType(l.type))
        .map((l: any) => ({ id: l.id, name: l.name, type: l.type }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))}
      characters={availableCharacters}
      members={acceptedMembers}
      isGM={isGM}
    />
  );

  const MembersTab = (
    <div className="space-y-6">
      {/* Group Reward Form (GM Only) */}
      {isGM && acceptedMembers.length > 0 && (
        <GroupRewardForm
          campaignId={id}
          memberCount={acceptedMembers.length}
        />
      )}

      {/* Members Management */}
      <MembersManagement
        campaignId={id}
        pendingApplications={pendingApplications}
        draftingMembers={draftingMembers}
        inReviewMembers={inReviewMembers}
        acceptedMembers={acceptedMembers}
        isGM={isGM}
        factions={factions.filter((f: any) => f.is_revealed)}
        locations={loreEntries.filter(
          (l: any) =>
            l.is_revealed && ["Stadt", "Region", "Dorf"].includes(l.type),
        )}
        npcs={npcs.filter((n: any) => n.is_revealed)}
      />
    </div>
  );

  const GEOGRAPHIC_TYPES = [
    "Stadt",
    "Region",
    "Ort",
    "Akademie",
    "Tempel",
    "Gilde",
  ];
  const typeMatchesGeographic = (type: string | null | undefined) =>
    GEOGRAPHIC_TYPES.some(
      (t) => String(t).toLowerCase() === String(type ?? "").toLowerCase(),
    );

  // Sichere Fallbacks für Einstellungen/Onboarding
  const safeFactions = factions ?? [];
  const safeLoreEntries = loreEntries ?? [];
  const safeNpcs = npcs ?? [];
  const onboardingLocations = safeLoreEntries.filter((e: any) =>
    typeMatchesGeographic(e.type),
  );

  /** Wie Charakter-Wizard / getCharacterWizardLoreData: Rasse, Kultur, Sprache (siehe TYPE_MAPPING.Culture). */
  const wizardLoreTypes = new Set(TYPE_MAPPING.Culture);
  const cultureLanguageLoreForSettings = safeLoreEntries
    .filter((e: any) => wizardLoreTypes.has(String(e.type ?? "")))
    .map((e: any) => ({
      id: e.id as string,
      name: String(e.name ?? ""),
      type: String(e.type ?? ""),
      is_revealed: !!e.is_revealed,
    }));

  const nextSessionLandingSettingsRow = (() => {
    const list = (sessions || []).filter(
      (s: any) =>
        s.status === "Scheduled" &&
        s.start_time &&
        new Date(String(s.start_time)).getTime() > nowMs,
    );
    list.sort(
      (a: any, b: any) =>
        new Date(String(a.start_time)).getTime() -
        new Date(String(b.start_time)).getTime(),
    );
    const s = list[0] as Record<string, unknown> | undefined;
    if (!s) return null;
    return {
      id: String(s.id),
      title: s.title != null ? String(s.title) : null,
      start_time: String(s.start_time),
      visible_on_public_landing: s.visible_on_public_landing !== false,
      show_open_slots_on_landing: s.show_open_slots_on_landing !== false,
      registration_closed_on_landing: !!s.registration_closed_on_landing,
      show_session_title_on_landing: s.show_session_title_on_landing !== false,
    };
  })();

  const SettingsTabContent = (
    <div className="space-y-8">
      <h2 className="font-barlow font-bold text-xl text-white uppercase border-b border-hero-dark pb-2">
        Kampagnen-Einstellungen
      </h2>

      {/* Allgemeine Einstellungen */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-barlow font-bold text-lg text-accent-gold uppercase mb-4 border-b border-hero-border pb-2">
              Allgemeine Einstellungen
            </h3>
            <form
              action={updateCampaignDetails.bind(null, id)}
              className="space-y-4"
              suppressHydrationWarning={true}
            >
              <div>
                <label
                  htmlFor="settings_name"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Kampagnenname *
                </label>
                <input
                  type="text"
                  id="settings_name"
                  name="name"
                  defaultValue={campaign.name || ""}
                  placeholder="z.B. Zeitalter der Wiedergeburt"
                  required
                  minLength={2}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>
              <div>
                <label
                  htmlFor="settings_banner_url"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Banner Bild URL
                </label>
                <input
                  type="url"
                  id="settings_banner_url"
                  name="banner_url"
                  defaultValue={campaign.banner_url || ""}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>
              <div>
                <label
                  htmlFor="settings_looking_for"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Gesucht wird
                </label>
                <input
                  type="text"
                  id="settings_looking_for"
                  name="looking_for"
                  defaultValue={campaign.looking_for || ""}
                  placeholder="z.B. Noch 1 Heiler und 1 Face"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none"
                  suppressHydrationWarning={true}
                />
              </div>
              <div>
                <label
                  htmlFor="settings_house_rules"
                  className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300"
                >
                  Hausregeln
                </label>
                <textarea
                  id="settings_house_rules"
                  name="house_rules"
                  defaultValue={campaign.house_rules || ""}
                  rows={4}
                  placeholder="z.B. Keine bösen Charaktere, Homebrew erlaubt nach Absprache"
                  className="w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none resize-none"
                  suppressHydrationWarning={true}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded border border-hero-border bg-hero-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors"
                suppressHydrationWarning={true}
              >
                Speichern
              </button>
            </form>
          </div>

          {/* Spielplan & Termine */}
          <CampaignScheduleForm
            campaignId={id}
            initialInterval={campaign.schedule_interval ?? null}
            initialDay={campaign.schedule_day ?? null}
            initialTime={campaign.schedule_time ?? null}
            initialDuration={campaign.schedule_duration_hours ?? null}
            initialFrequencyNote={campaign.frequency ?? null}
          />

          {discordSettings ? (
            <CampaignDiscordSettings campaignId={id} initial={discordSettings} />
          ) : null}
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4 flex items-center gap-2">
              {campaign.is_published ? (
                <Eye className="h-5 w-5 text-green-400" />
              ) : (
                <EyeOff className="h-5 w-5 text-gray-500" />
              )}
              Sichtbarkeit
            </h3>
            <div className="mb-4">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-barlow font-bold uppercase text-sm ${
                  campaign.is_published
                    ? "bg-green-900/30 text-green-400 border border-green-700"
                    : "bg-gray-700/30 text-gray-400 border border-gray-600"
                }`}
              >
                {campaign.is_published ? "🌍 Öffentlich" : "🔒 Privat"}
              </div>
            </div>
            <p className="font-libre text-xs text-gray-400 mb-4">
              {campaign.is_published
                ? "Diese Kampagne ist auf der Landing Page sichtbar und Spieler können beitreten."
                : "Diese Kampagne ist privat. Nur du kannst sie sehen."}
            </p>
            <form
              action={togglePublishStatus.bind(null, id, campaign.is_published)}
              suppressHydrationWarning={true}
            >
              <button
                type="submit"
                className={`w-full rounded-md border px-4 py-2.5 font-barlow font-bold uppercase text-sm transition-colors ${
                  campaign.is_published
                    ? "border-gray-600 bg-gray-700 text-white hover:bg-gray-600"
                    : "border-hero-border bg-hero-dark text-white hover:bg-hero-vibrant"
                }`}
                suppressHydrationWarning={true}
              >
                {campaign.is_published ? "Privat schalten" : "Veröffentlichen"}
              </button>
            </form>

            <CampaignSessionLandingVisibility
              campaignId={id}
              session={nextSessionLandingSettingsRow}
            />
          </div>
        </div>
      </div>

      {/* Onboarding */}
      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h3 className="font-barlow font-bold text-lg text-accent-gold uppercase mb-4 border-b border-hero-border pb-2">
          Onboarding
        </h3>
        <OnboardingSettings
          campaignId={id}
          factions={safeFactions}
          locations={onboardingLocations}
          cultureLanguageLore={cultureLanguageLoreForSettings}
          npcs={safeNpcs.map((n: any) => ({
            id: n.id,
            name: n.name ?? "",
            title: n.title ?? null,
            role: n.role ?? null,
            allow_pc_onboarding: n.allow_pc_onboarding ?? false,
          }))}
        />
      </div>
    </div>
  );

  // Spieler-Übersicht (Home-Base): DiscoverySlider, Mein Charakter, PartyOverview
  const PlayerOverviewContent = (
    <div className="space-y-8">
      {!isGM && canShowPlayerCharacterCreator && (
          <div className="rounded-lg border border-hero-vibrant bg-linear-to-br from-hero-dark/50 to-background-card p-6">
            <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-border pb-2 flex items-center gap-2">
              <Users className="h-5 w-5 text-accent-gold" />
              {userMembershipStatus === "Drafting"
                ? "Charakterentwurf fortsetzen"
                : "Charakter erstellen"}
            </h2>
            <p className="font-libre text-gray-300 mb-4">
              {userMembershipStatus === "Drafting"
                ? "Setze deinen Charakterentwurf fort und vervollständige ihn."
                : "Du wurdest als Spieler akzeptiert! Erstelle jetzt deinen Charakter für diese Kampagne."}
            </p>
            <CharacterCreatorButton campaignId={id} />
          </div>
        )}
      <DiscoverySlider items={allDiscoveries} campaignId={id} />
      {myCharacterForClient ? (
        <div className="space-y-4">
          <PlayerCampaignCharacterOverview
            campaignId={id}
            character={myCharacterForClient as any}
            factionReputations={characterReputations}
            lastAchievement={lastPlayerAchievement}
            nextSessionConfirmed={playerNextSessionData?.isAttendingNextSession ?? false}
            availableLanguages={wizardLanguages}
          />
          <Link
            href={`/dashboard/campaigns/${id}?tab=character`}
            className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark/30 px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:border-accent-gold hover:text-accent-gold transition-colors"
          >
            <User className="h-4 w-4" />
            Vollständiges Charakterblatt
          </Link>
        </div>
      ) : (
        <section className="rounded-lg border border-hero-dark bg-background-card p-6">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
            <User className="h-6 w-6 text-accent-gold" />
            Mein Charakter
          </h2>
          <p className="font-libre text-gray-500 italic">
            Du hast noch keinen Charakter für diese Kampagne. Erstelle einen über die Box oben.
          </p>
        </section>
      )}
      <section className="rounded-xl border border-white/10 bg-player-marble-section p-6 shadow-xl space-y-6">
        <h2 className="font-barlow font-semibold text-2xl text-stone-100 border-b border-white/15 pb-2 flex items-center gap-2">
          <Users className="h-6 w-6 text-accent-gold" />
          Die Gruppe
        </h2>
        <PartyOverview party={party} hideTitle embedded />
        {playerNextSessionData && (
          <PlayerCampaignNextSession
            campaignId={id}
            session={playerNextSessionData.session}
            userRsvp={playerNextSessionData.userRsvp}
            deadlineReached={playerNextSessionData.deadlineReached}
            viaOnlineTaken={playerNextSessionData.viaOnlineTaken}
            hasCharacter={!!myCharacterForClient}
          />
        )}
        {!isGM && latestPublishedPlayerRecap ? (
          <LastSessionRecapCard
            campaignId={id}
            worldId={campaignWorldId ?? null}
            recap={latestPublishedPlayerRecap}
          />
        ) : null}
      </section>
    </div>
  );

  const showPlayerRsvpDeadlineBanner =
    tab === "overview" &&
    !isGM &&
    hasAccess &&
    playerNextSessionData &&
    playerNextSessionData.session.status === "Scheduled" &&
    !playerNextSessionData.userRsvp &&
    (sessionRequiresCharacter(playerNextSessionData.session.type)
      ? !!myCharacterForClient
      : true);

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Dashboard
      </Link>

      {/* Cinematic Header */}
      <CinematicCampaignHeader
        name={campaign.name}
        system={campaign.system}
        status={campaign.status}
        imageUrl={campaign.banner_url || campaign.image_url || null}
        campaignId={id}
        galleryImages={galleryImages}
      />

      {showPlayerRsvpDeadlineBanner && playerNextSessionData && (
        <PlayerRsvpDeadlineBanner
          sessionTitle={playerNextSessionData.session.title}
          rsvpDeadlineEndIso={playerNextSessionData.rsvpDeadlineEndIso}
          sessionStartIso={playerNextSessionData.session.start_time}
        />
      )}

      {/* Campaign Stats (below header) */}
      <div className="flex items-center gap-4 text-sm font-libre text-gray-400">
        <span
          className={`flex items-center gap-1 rounded px-3 py-1.5 ${
            acceptedMembersCount >= campaign.max_players
              ? "bg-red-900/30 text-red-400 border border-red-700"
              : acceptedMembersCount >= campaign.max_players * 0.8
              ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700"
              : "bg-green-900/30 text-green-400 border border-green-700"
          }`}
        >
          <Users className="h-4 w-4" />
          {acceptedMembersCount}/{campaign.max_players} Spieler
        </span>
        <span className="flex items-center gap-1 rounded px-3 py-1.5 bg-background-card border border-hero-dark">
          <MapPin className="h-4 w-4" />
          {campaign.mode}
        </span>
      </div>

      {/* Tab Content (Conditional Rendering based on searchParams.tab) */}
      {tab === "overview" && !isGM && hasAccess && PlayerOverviewContent}
      {tab === "overview" && (isGM || !hasAccess) && OverviewTab}
      {tab === "sessions" &&
        !isGM &&
        hasAccess &&
        !myCharacter && (
          <div className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-8 text-center space-y-4">
            <p className="font-barlow font-bold text-lg text-amber-200 uppercase">
              Termine & Rückmeldung
            </p>
            <p className="font-libre text-gray-300 max-w-lg mx-auto">
              Eine Rückmeldung zu geplanten Terminen (Zusage/Absage) ist erst möglich,
              wenn du einen Charakter für diese Kampagne erstellt hast.
            </p>
            <Link
              href={`/dashboard/campaigns/${id}/character/new`}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-5 py-2.5 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors"
            >
              Charakter erstellen
            </Link>
          </div>
        )}
      {tab === "sessions" && (isGM || (hasAccess && myCharacter)) && SessionsTabContent}
      {tab === "lore" && LoreTab}
      {tab === "npcs" && (
        <div className="space-y-6">
          {NPCsTab}
          {isGM && <div className="mt-6">{FactionsTab}</div>}
        </div>
      )}
      {tab === "quests" && QuestTab}
      {tab === "members" && isGM && MembersTab}
      {tab === "character" && userHasCharacter && myCharacterForClient && (
        <MyCharacterSection
          campaignId={id}
          character={myCharacterForClient as any}
          cultures={wizardCultures}
          languages={wizardLanguages}
          factions={wizardFactions.map((f: any) => ({ id: String(f.id), name: String(f.name ?? "") }))}
          locations={wizardLocations.map((l: any) => ({
            id: String(l.id),
            name: String(l.name ?? ""),
            type: String(l.type ?? ""),
          }))}
          factionReputations={characterReputations}
        />
      )}
      {tab === "settings" && isGM && SettingsTabContent}
      {tab === "settings" && !isGM && (
        <div className="rounded-lg border border-hero-dark bg-background-card p-6">
          <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 border-b border-hero-dark pb-2">
            Kampagnen-Einstellungen
          </h2>
          <p className="font-libre text-gray-400">
            Nur der Spielleiter kann Einstellungen einsehen und ändern.
          </p>
        </div>
      )}
    </div>
  );
}
