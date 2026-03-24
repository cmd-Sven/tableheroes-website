"use client";

import Image from "next/image";

type Props = {
  children: React.ReactNode;
  className?: string;
  cornerImage?: string;
  topBottomBorderImage?: string;
  leftRightBorderImage?: string;
};

/** Höhe der oberen/unteren Border-Streifen (muss zur Eckenbreite w-16 passen, nicht h-4 quetschen) */
const TOP_BOTTOM_STRIP_H = "h-14"; /* 3.5rem ≈ 56px – genug für repeat-x ohne vertikales Zerquetschen */

export function ImageBorderContainer({
  children,
  className = "",
  cornerImage = "/images/corner_dragon.jpg",
  topBottomBorderImage = "/images/border_top-bottom_gold.png",
  leftRightBorderImage = "/images/border_left-right_gold.png",
}: Props) {
  return (
    <div className={`relative min-h-0 ${className}`}>
      {/* Content – min-h-full: Positionierungskontext hat volle Höhe (absolute Kinder im Lore-Header) */}
      <div className="relative z-10 min-h-full w-full box-border p-[25px]">{children}</div>

      {/* Top Border: beginnt innerhalb der Ecken (w-16 = 4rem) */}
      <div
        className={`pointer-events-none absolute top-0 left-16 right-16 z-20 ${TOP_BOTTOM_STRIP_H}`}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url('${topBottomBorderImage}')`,
            backgroundRepeat: "repeat-x",
            backgroundPosition: "center top",
            /* Höhe des Streifens nutzen, Breite pro Kachel proportional */
            backgroundSize: "auto 100%",
          }}
        />
      </div>

      {/* Bottom Border */}
      <div
        className={`pointer-events-none absolute bottom-0 left-16 right-16 z-20 ${TOP_BOTTOM_STRIP_H}`}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url('${topBottomBorderImage}')`,
            backgroundRepeat: "repeat-x",
            backgroundPosition: "center bottom",
            backgroundSize: "auto 100%",
          }}
        />
      </div>

      {/* Left Border - positioned after corners to overlap */}
      <div className="absolute top-16 bottom-16 left-0 w-8 z-20 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url('${leftRightBorderImage}')`,
            backgroundSize: "auto",
            backgroundRepeat: "repeat-y",
            backgroundPosition: "left center",
          }}
        />
      </div>

      {/* Right Border - positioned after corners to overlap */}
      <div className="absolute top-16 bottom-16 right-0 w-8 z-20 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url('${leftRightBorderImage}')`,
            backgroundSize: "auto",
            backgroundRepeat: "repeat-y",
            backgroundPosition: "right center",
          }}
        />
      </div>

      {/* Top Left Corner */}
      <div className="absolute top-0 left-0 w-16 h-16 z-30 pointer-events-none">
        <Image
          src={cornerImage}
          alt=""
          fill
          className="object-contain"
        />
      </div>

      {/* Top Right Corner */}
      <div className="absolute top-0 right-0 w-16 h-16 z-30 pointer-events-none">
        <Image
          src={cornerImage}
          alt=""
          fill
          className="object-contain"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>

      {/* Bottom Left Corner */}
      <div className="absolute bottom-0 left-0 w-16 h-16 z-30 pointer-events-none">
        <Image
          src={cornerImage}
          alt=""
          fill
          className="object-contain"
          style={{ transform: "scaleY(-1)" }}
        />
      </div>

      {/* Bottom Right Corner */}
      <div className="absolute bottom-0 right-0 w-16 h-16 z-30 pointer-events-none">
        <Image
          src={cornerImage}
          alt=""
          fill
          className="object-contain"
          style={{ transform: "scale(-1)" }}
        />
      </div>
    </div>
  );
}

