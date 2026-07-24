import { Suspense } from "react";
import { Sidebar } from "@/src/components/dashboard/Sidebar";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { Footer } from "@/src/components/layout/Footer";
import { signOut } from "@/src/app/(auth)/signout-action";
import { cookies } from "next/headers";
import { SidebarWidthProvider } from "@/src/components/dashboard/SidebarWidthProvider";
import { getPendingApplicationsCount } from "@/src/lib/queries/application-queries";
import { getMaintenanceStatus } from "@/src/lib/queries/admin-queries";
import { getDashboardProfile } from "@/src/lib/dashboard/get-dashboard-profile";

export const dynamic = "force-dynamic";

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

  // Gleicher Cache wie /dashboard — kein zweiter users-Fetch im gleichen Request
  const profile = await getDashboardProfile(user.id);

  const status = profile?.status ?? "approved";
  const isPendingOrRejected = status === "pending" || status === "rejected";

  const userData = {
    id: profile?.id ?? user.id,
    username: profile?.username ?? null,
    avatar_url: profile?.avatar_url ?? null,
    email: user.email ?? undefined,
    primary_role: profile?.primary_role ?? "Player",
    display_name: profile?.display_name ?? null,
    role: profile?.role ?? null,
  };

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

  const cookieStore = await cookies();
  const sidebarCollapsed =
    cookieStore.get("sidebar-collapsed")?.value === "true";
  const sidebarWidth = sidebarCollapsed ? "4rem" : "16rem";

  return (
    <SidebarWidthProvider initialCollapsed={sidebarCollapsed}>
      <div className="flex h-screen overflow-hidden bg-background-dark">
        <Suspense
          fallback={
            <aside
              className="fixed inset-y-0 left-0 z-40 hidden shrink-0 border-r border-hero-border bg-background-card md:block"
              style={{ width: sidebarWidth }}
              aria-label="Navigation wird geladen"
            />
          }
        >
          <Sidebar
            user={userData}
            initialCollapsed={sidebarCollapsed}
            pendingApplicationsCount={pendingApplicationsCount}
            maintenanceMode={maintenanceMode}
          />
        </Suspense>

        <main
          className="flex-1 flex flex-col overflow-hidden transition-all duration-200"
          style={{ marginLeft: "var(--sidebar-width, " + sidebarWidth + ")" }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 md:p-10">{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </SidebarWidthProvider>
  );
}
