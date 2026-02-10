import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllUsersForAdmin } from "@/src/lib/actions/admin-actions";
import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  const role = (profile as { primary_role?: string } | null)?.primary_role;
  if (role !== "Admin") {
    redirect("/dashboard");
  }

  const allUsers = await getAllUsersForAdmin();
  console.log(
    "User Status Map:",
    allUsers.map((u) => ({ email: u.email, status: u.status }))
  );
  const pendingUsers = allUsers.filter(
    (u) => u.status === "pending" || !u.status
  );
  const approvedUsers = allUsers.filter((u) => u.status === "approved");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Nutzer-Verwaltung
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Neue Registrierungen prüfen, Helden freigeben oder sperren.
        </p>
      </div>
      <AdminUsersClient
        pendingUsers={pendingUsers}
        approvedUsers={approvedUsers}
      />
    </div>
  );
}
