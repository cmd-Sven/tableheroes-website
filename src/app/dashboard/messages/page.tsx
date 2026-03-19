import { createClient } from "@/src/lib/supabase/server";
import { getPlayerMessages } from "@/src/lib/actions/message-actions";
import { MessagesList } from "@/src/components/dashboard/MessagesList";
import { redirect } from "next/navigation";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const messages = await getPlayerMessages(user.id);

  return (
    <div className="space-y-6">
      <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
        Nachrichten
      </h1>
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
        Posteingang
      </h2>
      <MessagesList
        initialMessages={messages}
        currentUserId={user.id}
      />
    </div>
  );
}
