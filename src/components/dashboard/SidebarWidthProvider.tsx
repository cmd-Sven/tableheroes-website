"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  initialCollapsed: boolean;
};

export function SidebarWidthProvider({ children, initialCollapsed }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        document.documentElement.style.setProperty("--sidebar-width", "0");
      } else {
        const width = isCollapsed ? "4rem" : "16rem";
        document.documentElement.style.setProperty("--sidebar-width", width);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isCollapsed]);

  // Listen for sidebar collapse events from Sidebar component
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent<boolean>) => {
      setIsCollapsed(e.detail);
    };

    window.addEventListener("sidebar-toggle" as any, handleSidebarToggle);
    return () => {
      window.removeEventListener("sidebar-toggle" as any, handleSidebarToggle);
    };
  }, []);

  return <>{children}</>;
}


