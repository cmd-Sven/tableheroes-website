import type { Metadata } from "next";
import { Barlow_Condensed, Cinzel, Libre_Baskerville } from "next/font/google";
import { Toaster } from "sonner";
import { absoluteUrl, getSiteUrl } from "@/src/lib/site-url";
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
  style: "normal",
  variable: "--font-libre",
});

const libreItalic = Libre_Baskerville({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-libre-italic",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title:
    "Table-Heroes | Die TTRPG Community für Osnabrück & exklusives Member-Tool",
  description:
    "Die zentrale Anlaufstelle für Pen & Paper Spieler in Osnabrück. Werde Teil der Community und nutze unser exklusives TTRPG-Management-Tool für Mitglieder.",
  authors: [{ name: "Table-Heroes" }],
  verification: {
    google: "mzY6Ev9823X7RLOEqJb2k8TutAYQdf6XL9vYk4FK4v4",
  },
  openGraph: {
    title:
      "Table-Heroes | Die TTRPG Community für Osnabrück & exklusives Member-Tool",
    description:
      "Die zentrale Anlaufstelle für Pen & Paper Spieler in Osnabrück. Werde Teil der Community und nutze unser exklusives TTRPG-Management-Tool für Mitglieder.",
    url: absoluteUrl("/"),
    siteName: "Table-Heroes",
    images: [
      {
        url: "/images/tableHeroes-logo.png",
        width: 520,
        height: 160,
        alt: "Table-Heroes Logo",
      },
    ],
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title:
      "Table-Heroes | Die TTRPG Community für Osnabrück & exklusives Member-Tool",
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
  const siteUrl = getSiteUrl();
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Table-Heroes",
    description:
      "Community-Plattform für TTRPG-Spieler in Osnabrück mit geschlossener Mitglieder-Area und proprietärem Spielleiter-Tool.",
    url: siteUrl,
    areaServed: {
      "@type": "City",
      name: "Osnabrück",
      containedInPlace: {
        "@type": "Country",
        name: "Germany",
      },
    },
    logo: absoluteUrl("/images/tableHeroes-logo.png"),
    sameAs: [
      "https://discord.gg/JzfXw9b7v7",
      "https://instagram.com/tableheroes",
    ],
  };

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Table-Heroes",
    applicationCategory: "GameApplication",
    operatingSystem: "Web-based",
    description:
      "Die ultimative TTRPG-Plattform für Pen and Paper Abenteuer, Community-Management und Gamification.",
    url: siteUrl,
    publisher: {
      "@type": "Organization",
      name: "Table-Heroes",
    },
    areaServed: {
      "@type": "City",
      name: "Osnabrück",
      containedInPlace: {
        "@type": "Country",
        name: "Germany",
      },
    },
  };

  return (
    <html lang="de" suppressHydrationWarning>
      <body
        className={`${barlow.variable} ${cinzel.variable} ${libre.variable} ${libreItalic.variable} font-libre bg-background-dark text-gray-100`}
        suppressHydrationWarning={true}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationSchema).replace(/</g, "\\u003c"),
          }}
        />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
