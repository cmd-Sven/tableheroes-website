import { Sidebar } from "@/src/components/dashboard/Sidebar";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { Footer } from "@/src/components/layout/Footer";
import { cookies } from "next/headers";
import { SidebarWidthProvider } from "@/src/components/dashboard/SidebarWidthProvider";

type DashboardProfile = {
  username: string | null;
  avatar_url: string | null;
  primary_role: string;
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

  // Fetch User Profile (Username/Avatar/Role)
  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("username, avatar_url, primary_role")
    .eq("id", user.id)
    .single();

  // Der 'unknown' Cast bricht die 'never' Vererbung auf
  const profile = profileRaw as unknown as DashboardProfile | null;

  const userData = {
    username: profile?.username || null,
    avatar_url: profile?.avatar_url || null,
    email: user.email,
    primary_role: profile?.primary_role || "Player",
  };

  // Read sidebar collapsed state from cookie
  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";
  const sidebarWidth = sidebarCollapsed ? "4rem" : "16rem";

  return (
    <SidebarWidthProvider initialCollapsed={sidebarCollapsed}>
      <div className="flex h-screen overflow-hidden bg-background-dark">
        {/* Sidebar (Fixed) */}
        <Sidebar user={userData} initialCollapsed={sidebarCollapsed} />
        
        {/* Main Content Area (Flexible) */}
        <main 
          className="flex-1 flex flex-col overflow-hidden transition-all duration-200" 
          style={{ marginLeft: "var(--sidebar-width, " + sidebarWidth + ")" }}
        >
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-10">
            {children}
          </div>
          
          {/* Footer inside scrollable area */}
          <Footer />
        </div>
      </main>
    </div>
    </SidebarWidthProvider>
  );
}

