import type { ReactNode } from "react";

import { MarketingLayout } from "@/src/components/marketing/MarketingLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return <MarketingLayout>{children}</MarketingLayout>;
}




