import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { SessionGuestJoinClient } from "./SessionGuestJoinClient";
import { readGuestSessionCookie } from "@/src/lib/session-guest-auth";
import { absoluteUrl } from "@/src/lib/site-url";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function SessionJoinPage({ params }: Props) {
  const { token } = await params;
  const trimmed = token?.trim();
  if (!trimmed || trimmed.length < 16) notFound();

  const admin = createAdminClient();
  const { data: sessionRaw } = await (admin.from("sessions") as any)
    .select("id, title, status, campaign_id")
    .eq("guest_join_token", trimmed)
    .maybeSingle();

  if (!sessionRaw) notFound();

  const session = sessionRaw as {
    id: string;
    title?: string | null;
    status: string;
    campaign_id: string;
  };

  const guestCookie = await readGuestSessionCookie();
  if (guestCookie?.sessionId === session.id) {
    redirect(`/session/${session.id}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/session/${session.id}`);
  }

  const { data: campaignRaw } = await (admin.from("campaigns") as any)
    .select("name")
    .eq("id", session.campaign_id)
    .maybeSingle();

  const joinInfo = {
    ok: true,
    session_title: session.title ?? "Live-Session",
    campaign_name: (campaignRaw as { name?: string | null } | null)?.name ?? "Kampagne",
    is_live: session.status === "Live",
  };

  return (
    <div className="min-h-screen bg-background-dark px-4 py-16">
      <SessionGuestJoinClient
        token={trimmed}
        joinInfo={joinInfo}
        registeredSessionUrl={null}
      />
      <p className="mt-8 text-center font-libre text-xs text-gray-600">
        Table Heroes · {absoluteUrl(`/session/join/${trimmed}`)}
      </p>
    </div>
  );
}
