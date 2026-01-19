"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

type GalleryImage = {
  id: string;
  url: string;
  altText: string;
  type: "lore" | "npc" | "faction";
};

type Props = {
  images: GalleryImage[];
  campaignId: string;
};

export function CampaignHeaderGallery({ images, campaignId }: Props) {
  if (!images || images.length === 0) {
    return null;
  }

  // Duplicate images for seamless loop (triple for smoother transition)
  const duplicatedImages = [...images, ...images, ...images];

  // Calculate dimensions
  const imageWidth = 192; // w-48 = 192px
  const gap = 16; // gap-4 = 16px
  const singleSetWidth = images.length * (imageWidth + gap);
  const totalWidth = duplicatedImages.length * (imageWidth + gap);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden bg-gradient-to-t from-background-dark/95 via-background-dark/80 to-transparent pointer-events-none z-10">
      <motion.div
        className="flex gap-4 h-full"
        animate={{
          x: [0, -singleSetWidth], // Move by one set width for seamless loop
        }}
        transition={{
          duration: images.length * 20, // 20 seconds per image set
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          width: `${totalWidth}px`,
        }}
      >
        {duplicatedImages.map((image, index) => (
          <Link
            key={`${image.id}-${index}`}
            href={`/dashboard/campaigns/${campaignId}?tab=${
              image.type === "lore"
                ? "lore"
                : image.type === "npc"
                ? "npcs"
                : "npcs"
            }`}
            title={image.altText}
            className="relative w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden border-2 border-hero-border/50 hover:border-hero-vibrant transition-colors pointer-events-auto group"
          >
            <Image
              src={image.url}
              alt={image.altText}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              sizes="192px"
            />
            {/* Overlay with name */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-2 left-2 right-2">
                <p className="font-barlow font-bold text-xs text-white truncate">
                  {image.altText}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}

