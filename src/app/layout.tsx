import type { Metadata } from "next";
import { Barlow_Condensed, Cinzel, Libre_Baskerville } from "next/font/google";
import "./globals.css";

// 1. Schriften konfigurieren
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"], // SemiBold, Bold, ExtraBold
  variable: "--font-barlow",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["700"], // Bold
  variable: "--font-cinzel",
});

const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre",
});

export const metadata: Metadata = {
  title: "TableHeroes",
  description: "Dein RPG Kampagnen Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      {/* 2. Variablen in den Body injizieren */}
      <body
        className={`${barlow.variable} ${cinzel.variable} ${libre.variable} font-libre bg-background-dark text-gray-100`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
