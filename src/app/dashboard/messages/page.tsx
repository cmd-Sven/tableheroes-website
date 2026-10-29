import { createClient } from "@/src/lib/supabase/server";
import {
  getPlayerMessageTargets,
  getPlayerMessages,
} from "@/src/lib/queries/message-queries";
import { MessagesList } from "@/src/components/dashboard/MessagesList";
import { PlayerMessageCompose } from "@/src/components/dashboard/PlayerMessageCompose";
import { redirect } from "next/navigation";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [messages, targets] = await Promise.all([
    getPlayerMessages(user.id),
    getPlayerMessageTargets(user.id),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-barlow text-4xl font-extrabold uppercase tracking-wide text-hero-vibrant">
        Nachrichten
      </h1>
      <PlayerMessageCompose targets={targets} />
      <h2 className="mb-4 border-b border-hero-border pb-2 font-barlow text-2xl font-semibold text-accent-blood">
        Posteingang
      </h2>
      <MessagesList initialMessages={messages} currentUserId={user.id} />
    </div>
  );
}
