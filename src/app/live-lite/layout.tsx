import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bühne",
  robots: { index: false, follow: false, nocache: true },
};

export default function LiveLiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
