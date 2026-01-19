"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client component to handle redirect when campaign is deleted
 * This should be used on campaign detail pages to check if campaign still exists
 */
export function CampaignDeletedRedirect() {
  const router = useRouter();

  useEffect(() => {
    // This component will be rendered if the campaign doesn't exist
    // The server component should handle notFound(), but this is a safety net
    const timer = setTimeout(() => {
      router.replace("/dashboard");
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}

