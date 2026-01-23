"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type GameItem = {
  name: string;
  logo?: string;
};

const GAME_SYSTEMS: GameItem[] = [
  { name: "Dungeons & Dragons", logo: "/images/logos/dnd_logo.jpg" },
  { name: "Call of Cthulhu", logo: "/images/logos/cthulhu-logo.png" },
  { name: "Pathfinder 2e", logo: "/images/logos/pathfinder2-logo.jpg" },
  { name: "Shadowrun", logo: "/images/logos/shadowrun-5-logo.png" },
  {
    name: "Vampire: The Masquerade",
    logo: "/images/logos/vampire-logo.jpg",
  },
  { name: "Star Wars: Edge of the Empire", logo: "/images/logos/star_wars-logo.jpg" },
];

const TOOLS: GameItem[] = [
  { name: "Dungeon Alchemist", logo: "/images/logos/DungeonAlchemist.webp" },
  { name: "Inkarnate", logo: "/images/logos/inkarnate.webp" },
  { name: "Foundry VTT", logo: "/images/logos/Foundry.png" },
  { name: "The Forge", logo: "/images/logos/The Forge.webp" },
  { name: "Roll20", logo: "/images/logos/roll20-logo.png" },
];

function ItemCard({ item }: { item: GameItem }) {
  const hasLogo = Boolean(item.logo);

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-amber-700/50 bg-background-card/90 p-4 shadow-lg">
      {hasLogo ? (
        <div className="relative h-12 w-24 md:h-14 md:w-28 flex items-center justify-center">
          <Image
            src={item.logo as string}
            alt={item.name}
            fill
            sizes="120px"
            className="object-contain"
            priority={false}
          />
        </div>
      ) : (
        <div className="flex h-12 items-center justify-center">
          <span className="font-cinzel text-sm text-amber-200 text-center">
            {item.name}
          </span>
        </div>
      )}
      <span className="font-libre text-xs md:text-sm text-gray-100 text-center">
        {item.name}
      </span>
    </div>
  );
}

export function SystemsSection() {
  return (
    <section
      id="systems"
      className="relative scroll-mt-20 bg-background-dark"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8">
            Was und wie wir spielen
          </h2>
          <p className="font-libre text-gray-200 leading-relaxed mb-10">
            Systeme, Settings und Tools – so bringen wir unsere Abenteuer an den Tisch.
          </p>

          {/* Gruppe 1: Spielsysteme */}
          <div className="mb-10">
            <h3 className="font-cinzel text-xl font-bold mb-6 text-amber-500">
              Spielsysteme
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {GAME_SYSTEMS.map((item) => (
                <ItemCard key={item.name} item={item} />
              ))}
            </div>
          </div>

          {/* Gruppe 2: Tools und Software */}
          <div>
            <h3 className="font-cinzel text-xl font-bold mb-6 text-amber-500">
              Tools und Software
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {TOOLS.map((item) => (
                <ItemCard key={item.name} item={item} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      {/* Goldene, sich wiederholende Border zwischen Sektionen */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 z-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "url('/images/border_top-bottom_gold.png')",
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "bottom center",
          }}
        />
      </div>
    </section>
  );
}

