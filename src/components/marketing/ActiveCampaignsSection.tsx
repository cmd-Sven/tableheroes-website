import Image from "next/image";
import { supabase } from "@/src/lib/supabaseClient";
import {
  CampaignListAnimation,
  type SessionTicket,
} from "@/src/components/marketing/CampaignListAnimation";

// DB Types (manuell gemappt aus Query-Result)
type UserRow = {
  username: string | null;
  avatar_url: string | null;
};

type SessionRow = {
  id: string;
  start_time: string | null;
  status: string | null;
};

type CampaignWithRelations = {
  id: string;
  name: string | null;
  system: string | null;
  max_players: number | null;
  mode: string | null;
  banner_url: string | null;
  gm: UserRow | null;
  sessions: SessionRow[];
};

export async function ActiveCampaignsSection() {
  // 1. Fetch Campaigns + GM + Sessions
  // Wir holen zusätzlich 'mode' aus campaigns, um es als Ort anzuzeigen (Online/Hybrid/Tisch).
  const { data, error } = await supabase
    .from("campaigns")
    .select(
      `
      id,
      name,
      system,
      max_players,
      mode,
      banner_url,
      gm:users!gm_id (username, avatar_url),
      sessions (id, start_time, status)
    `
    )
    .eq("status", "Active")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("ActiveCampaignsSection Fetch Error:", error.message);
    return null;
  }

  if (!data) return null;

  // Casten, weil Supabase Types manchmal tricky sind bei Deep Joins
  const campaigns = data as unknown as CampaignWithRelations[];

  const now = new Date();

  // 2. JS-Logik: Nächste Session finden & Sortieren
  const relevantCampaigns = campaigns
    .map((c) => {
      if (!c.sessions) return null;
      const futureSessions = c.sessions
        .filter((s) => s.start_time && new Date(s.start_time) > now)
        .sort(
          (a, b) =>
            new Date(a.start_time!).getTime() -
            new Date(b.start_time!).getTime()
        );

      if (futureSessions.length === 0) return null;

      return {
        campaign: c,
        nextSession: futureSessions[0],
        dateObj: new Date(futureSessions[0].start_time!),
      };
    })
    .filter((item) => item !== null) as {
    campaign: CampaignWithRelations;
    nextSession: SessionRow;
    dateObj: Date;
  }[];

  // Sort by Date Ascending
  relevantCampaigns.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Limit 3
  const top3 = relevantCampaigns.slice(0, 3);

  // Final Mapping & Async Member Count fetching
  const finalTickets: SessionTicket[] = [];

  for (const item of top3) {
    const { campaign: c, dateObj } = item;

    // Slots fetch (immer noch in Loop, bei 3 Items okay)
    let currentPlayers = 0;
    const { count, error: countError } = await supabase
      .from("campaign_members")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", c.id)
      .eq("status", "Accepted");

    if (countError) {
      console.error(`❌ Count Error for Campaign ${c.id}:`, countError);
    }

    if (count !== null) currentPlayers = count;
    const max = c.max_players || 0;
    const freeSlots = Math.max(0, max - currentPlayers);
    
    // Debug Logging in Development
    if (process.env.NODE_ENV === "development") {
      console.log(`🎟️ Campaign "${c.name}": ${currentPlayers}/${max} occupied, ${freeSlots} free slots`);
    }

    // Visual Label mit Farbcodierung
    let slotsLabel = "";
    if (max === 0) {
      slotsLabel = "Auf Anfrage";
    } else if (freeSlots === 0) {
      slotsLabel = `Voll (${max}/${max})`;
    } else {
      slotsLabel = `${freeSlots}/${max} Plätze frei`;
    }

    const dateFormatter = new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Europe/Berlin",
    });
    const timeFormatter = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });

    finalTickets.push({
      campaignId: c.id,
      campaignName: c.name || "Unbenanntes Abenteuer",
      gameSystem: c.system || "System offen",
      gmUsername: c.gm?.username || "Unbekannt",
      gmAvatarUrl: c.gm?.avatar_url || null,
      bannerUrl: c.banner_url || null,
      location: c.mode || "Online",
      dateString: dateFormatter.format(dateObj),
      timeString: `${timeFormatter.format(dateObj)} Uhr`,
      slotsLabel,
    });
  }

  return (
    <section
      id="campaigns"
      className="relative scroll-mt-20 bg-background-dark"
      style={{
        backgroundImage: "url('/images/dark-wood.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        boxShadow: "0 -15px 40px rgba(0, 0, 0, 0.6), 0 15px 40px rgba(0, 0, 0, 0.6)",
        zIndex: 10,
      }}
    >
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="text-center md:text-left">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 inline-block">
            Aktuelle Runden in Osnabrück &amp; Online
          </h2>
          <p className="font-libre text-gray-200 leading-relaxed max-w-2xl">
            Hier findest du unsere laufenden Abenteuer. Egal ob Anfänger oder Veteran – such dir einen Platz am Tisch.
          </p>
        </div>

        <CampaignListAnimation tickets={finalTickets} />
      </div>

      {/* Dekorative Eck-Grafiken: Skull in allen vier Ecken */}
      {/* Oben Links: Skull (horizontal gespiegelt) */}
      <div className="pointer-events-none absolute top-0 left-0 z-30 hidden md:block">
        <Image
          src="/images/skull-corner-only.png"
          alt=""
          width={70}
          height={70}
          className="max-w-[70px] h-auto scale-x-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      {/* Unten Links: Skull (horizontal gespiegelt) mit 12px Abstand */}
      <div className="pointer-events-none absolute bottom-[12px] left-0 z-30 hidden md:block">
        <Image
          src="/images/skull-corner-only.png"
          alt=""
          width={70}
          height={70}
          className="max-w-[70px] h-auto scale-x-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      {/* Oben Rechts: Skull (vertikal gespiegelt) */}
      <div className="pointer-events-none absolute top-0 right-0 z-30 hidden md:block">
        <Image
          src="/images/skull-corner-only.png"
          alt=""
          width={70}
          height={70}
          className="max-w-[70px] h-auto scale-y-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      {/* Unten Rechts: Skull (horizontal gespiegelt) mit 12px Abstand */}
      <div className="pointer-events-none absolute bottom-[12px] right-0 z-30 hidden md:block">
        <Image
          src="/images/skull-corner-only.png"
          alt=""
          width={70}
          height={70}
          className="max-w-[70px] h-auto scale-x-[-1]"
          style={{ height: "auto" }}
        />
      </div>

      {/* Goldene, sich wiederholende Border zwischen Sektionen */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 z-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "url('/images/border_top-bottom_gold.png')",
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "bottom center",
          }}
        />
      </div>
    </section>
  );
}
