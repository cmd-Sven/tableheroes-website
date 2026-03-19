import type { Metadata } from "next";
import Script from "next/script";
import { Barlow_Condensed, Cinzel, Libre_Baskerville } from "next/font/google";
import { Toaster } from "sonner";
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
  title:
    "TableHeroes | Die TTRPG Community für Osnabrück & exklusives Member-Tool",
  description:
    "Die zentrale Anlaufstelle für Pen & Paper Spieler in Osnabrück. Werde Teil der Community und nutze unser exklusives TTRPG-Management-Tool für Mitglieder.",
  keywords: [
    "Pen and Paper Osnabrück",
    "TTRPG Tool Deutschland",
    "Rollenspiel Community Osnabrück",
    "Tabletop RPG",
    "TTRPG",
    "Community",
    "Gamification",
    "Osnabrück",
    "Rollenspiel",
    "D&D",
    "Pathfinder",
    "Kampagnen Manager",
  ],
  authors: [{ name: "TableHeroes" }],
  openGraph: {
    title:
      "TableHeroes | Die TTRPG Community für Osnabrück & exklusives Member-Tool",
    description:
      "Die zentrale Anlaufstelle für Pen & Paper Spieler in Osnabrück. Werde Teil der Community und nutze unser exklusives TTRPG-Management-Tool für Mitglieder.",
    url: "https://tableheroes.de",
    siteName: "TableHeroes",
    images: [
      {
        url: "/images/tableHeroes-logo.png",
        width: 520,
        height: 160,
        alt: "TableHeroes Logo",
      },
    ],
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "TableHeroes | Die TTRPG Community für Osnabrück & exklusives Member-Tool",
    description:
      "Die zentrale Anlaufstelle für Pen & Paper Spieler in Osnabrück. Werde Teil der Community und nutze unser exklusives TTRPG-Management-Tool für Mitglieder.",
    images: ["/images/tableHeroes-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/images/table_Heroes_Icon.png",
    apple: "/images/table_Heroes_Icon.png",
    shortcut: "/images/table_Heroes_Icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD Strukturierte Daten für SEO
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TableHeroes",
    description:
      "Community-Plattform für TTRPG-Spieler in Osnabrück mit geschlossener Mitglieder-Area und proprietärem Spielleiter-Tool.",
    url: "https://tableheroes.de",
    areaServed: {
      "@type": "City",
      name: "Osnabrück",
      containedIn: {
        "@type": "Country",
        name: "Germany",
      },
    },
    logo: "https://tableheroes.de/images/tableHeroes-logo.png",
    sameAs: [
      "https://discord.gg/JzfXw9b7v7",
      "https://instagram.com/tableheroes",
    ],
  };

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TableHeroes",
    applicationCategory: "GameApplication",
    operatingSystem: "Web-based",
    description:
      "Die ultimative TTRPG-Plattform für Pen and Paper Abenteuer, Community-Management und Gamification.",
    url: "https://tableheroes.de",
    publisher: {
      "@type": "Organization",
      name: "TableHeroes",
    },
    areaServed: {
      "@type": "City",
      name: "Osnabrück",
      containedIn: {
        "@type": "Country",
        name: "Germany",
      },
    },
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/MembersOnly",
      description: "Exklusiv für registrierte Mitglieder",
    },
    keywords:
      "Pen and Paper Osnabrück, TTRPG Tool Deutschland, Rollenspiel Community Osnabrück",
  };

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Google Search Console Verification */}
        <meta
          name="google-site-verification"
          content="mzY6Ev9823X7RLOEqJb2k8TutAYQdf6XL9vYk4FK4v4"
        />
      </head>
      <body
        className={`${barlow.variable} ${cinzel.variable} ${libre.variable} font-libre bg-background-dark text-gray-100`}
        suppressHydrationWarning={true}
      >
        {/* JSON-LD nur im body (vermeidet "script outside main document") */}
        <Script
          id="json-ld-organization"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="json-ld-software"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationSchema),
          }}
        />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
