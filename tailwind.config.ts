import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Falls dein App Router (noch) nicht unter /src liegt:
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deine Farbpalette
        hero: {
          dark: "#217d42", // Hauptfarbe Dunkelgrün
          vibrant: "#379806", // Kräftiges Grün
          border: "#23c763", // Border Grün
        },
        accent: {
          gold: "#cab926", // Akzent Gold
          white: "#ffffff",
          blood: "#58180D", // H2 Dunkelrot
        },
        // Ein dunkler Hintergrund passend zu deinem Grün (optional, für Dark Mode)
        background: {
          dark: "#0a1f10", // Sehr dunkles Grün/Schwarz für Hintergründe
          card: "#132e1b", // Etwas heller für Karten
        },
      },
      fontFamily: {
        // Wir verknüpfen hier die CSS-Variablen (siehe Schritt B)
        barlow: ["var(--font-barlow)", "sans-serif"],
        cinzel: ["var(--font-cinzel)", "serif"],
        libre: ["var(--font-libre)", "serif"],
      },
      keyframes: {
        kenBurns: {
          "0%": { 
            transform: "scale(1) translate(0, 0)",
          },
          "100%": { 
            transform: "scale(1.15) translate(-2%, -2%)",
          },
        },
        fadeInBg: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        discoveryMarquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        kenBurns: "kenBurns 20s ease-in-out infinite",
        fadeInBg: "fadeInBg 0.8s ease-out forwards",
        discoveryMarquee: "discoveryMarquee 40s linear infinite",
      },
      scale: {
        '102': '1.02',
      },
    },
  },
  plugins: [],
};

export default config;
