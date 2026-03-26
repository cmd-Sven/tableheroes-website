import { Sidebar } from "@/src/components/dashboard/Sidebar";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { Footer } from "@/src/components/layout/Footer";
import { signOut } from "@/src/app/(auth)/signout-action";
import { cookies } from "next/headers";
import { SidebarWidthProvider } from "@/src/components/dashboard/SidebarWidthProvider";
import { getPendingApplicationsCount } from "@/src/lib/queries/application-queries";
import { getMaintenanceStatus } from "@/src/lib/queries/admin-queries";

export const dynamic = "force-dynamic";

type DashboardProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  primary_role: string | null;
  status?: string | null;
  display_name?: string | null;
  role?: string | null;
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profil explizit anhand der Auth-User-ID laden (kein Cache, alle benötigten Felder)
  const { data: profileRaw, error: profileError } = await (
    supabase.from("users") as any
  )
    .select(
      "id, username, display_name, role, primary_role, avatar_url, status"
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileRaw as unknown as DashboardProfile | null;

  const status = profile?.status ?? "approved";
  const isPendingOrRejected = status === "pending" || status === "rejected";

  // userData 1:1 aus Profil + Auth (kein Mapping, das Felder weglässt)
  const userData = {
    id: profile?.id ?? user.id,
    username: profile?.username ?? null,
    avatar_url: profile?.avatar_url ?? null,
    email: user.email ?? undefined,
    primary_role: profile?.primary_role ?? "Player",
    display_name: profile?.display_name ?? null,
    role: profile?.role ?? null,
  };

  // Nutzer mit Status pending/rejected: nur Pending-Seite anzeigen (kein Sidebar/App)
  if (isPendingOrRejected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant">
            Account wartet auf Freigabe
          </h1>
          <p className="font-libre text-gray-300">
            {status === "rejected"
              ? "Dein Account wurde abgelehnt. Bei Fragen wende dich an den Support."
              : "Dein Account wird von einem Administrator geprüft. Du erhältst Zugriff, sobald er freigegeben wurde."}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant/20"
            >
              Abmelden
            </button>
          </form>
        </div>
      </div>
    );
  }

  let pendingApplicationsCount = 0;
  let maintenanceMode = false;
  const role = userData.primary_role || "Player";
  if (role === "GameMaster" || role === "Admin") {
    pendingApplicationsCount = await getPendingApplicationsCount(user.id);
  }
  if (role === "Admin") {
    maintenanceMode = await getMaintenanceStatus();
  }

  // Read sidebar collapsed state from cookie
  const cookieStore = await cookies();
  const sidebarCollapsed =
    cookieStore.get("sidebar-collapsed")?.value === "true";
  const sidebarWidth = sidebarCollapsed ? "4rem" : "16rem";

  return (
    <SidebarWidthProvider initialCollapsed={sidebarCollapsed}>
      <div className="flex h-screen overflow-hidden bg-background-dark">
        {/* Sidebar (Fixed) */}
        <Sidebar
          user={userData}
          initialCollapsed={sidebarCollapsed}
          pendingApplicationsCount={pendingApplicationsCount}
          maintenanceMode={maintenanceMode}
        />

        {/* Main Content Area (Flexible) */}
        <main
          className="flex-1 flex flex-col overflow-hidden transition-all duration-200"
          style={{ marginLeft: "var(--sidebar-width, " + sidebarWidth + ")" }}
        >
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 md:p-10">{children}</div>

            {/* Footer inside scrollable area */}
            <Footer />
          </div>
        </main>
      </div>
    </SidebarWidthProvider>
  );
}
