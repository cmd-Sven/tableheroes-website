"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CampaignHeaderGallery } from "./CampaignHeaderGallery";

type GalleryImage = {
  id: string;
  url: string;
  altText: string;
  type: "lore" | "npc" | "faction";
};

type Props = {
  name: string;
  system?: string | null;
  status?: string | null;
  imageUrl?: string | null;
  campaignId: string;
  galleryImages?: GalleryImage[];
};

export function CinematicCampaignHeader({ name, system, status, imageUrl, campaignId, galleryImages = [] }: Props) {
  return (
    <div className="relative w-full aspect-[21/9] rounded-lg border border-hero-border bg-background-card overflow-hidden">
      {/* Background Image with Ken Burns Effect */}
      {imageUrl ? (
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute inset-0"
            animate={{
              scale: [1, 1.1, 1],
              x: [0, -2, 0],
              y: [0, -2, 0],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover"
              priority
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </motion.div>
        </div>
      ) : (
        // Fallback: Dark gradient pattern
        <div className="absolute inset-0 bg-gradient-to-br from-background-dark via-background-card to-background-dark">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
      )}

      {/* Gradient Overlays for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent pointer-events-none" />

      {/* Title - Top Left */}
      <motion.div
        className="absolute top-6 left-6 z-10 max-w-[60%]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h1
          className="font-barlow font-extrabold text-4xl lg:text-5xl uppercase tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.6)" }}
        >
          {name}
        </h1>
      </motion.div>

      {/* System and Status Badges - Top Right */}
      <motion.div
        className="absolute top-6 right-6 z-10 flex flex-col gap-2 items-end"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      >
        {system && (
          <span className="inline-block rounded bg-hero-dark/90 backdrop-blur-sm px-4 py-2 font-barlow font-bold uppercase text-sm text-white border border-hero-border shadow-lg">
            {system}
          </span>
        )}
        {status && (
          <span
            className={`inline-block rounded px-4 py-2 font-barlow font-bold uppercase text-sm border shadow-lg backdrop-blur-sm ${
              status === "Active"
                ? "bg-green-900/90 text-green-300 border-green-700"
                : status === "Paused"
                ? "bg-yellow-900/90 text-yellow-300 border-yellow-700"
                : "bg-gray-700/90 text-gray-300 border-gray-600"
            }`}
          >
            {status}
          </span>
        )}
      </motion.div>

      {/* Marquee Gallery at bottom */}
      {galleryImages.length > 0 && (
        <CampaignHeaderGallery images={galleryImages} campaignId={campaignId} />
      )}
    </div>
  );
}

