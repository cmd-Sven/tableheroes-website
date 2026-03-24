"use client";

import Image from "next/image";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** overlay: Hero über Bild (füllt per absolute). block: Lore ohne Bild – Höhe folgt dem Inhalt. */
  variant?: "overlay" | "block";
  cornerImage?: string;
  topBottomBorderImage?: string;
  leftRightBorderImage?: string;
};

/** Dünne Streifen; Ecken w-10 → left/right-Border zwischen top-10 und bottom-10 */
const CORNER = "h-10 w-10";
const TOP_BOTTOM_STRIP_H = "h-6";
const SIDE_STRIP_W = "w-3";

export function ImageBorderContainer({
  children,
  className = "",
  variant = "block",
  cornerImage = "/images/corner_dragon.jpg",
  topBottomBorderImage = "/images/border_top-bottom_gold.png",
  leftRightBorderImage = "/images/border_left-right_gold.png",
}: Props) {
  /* Kleinere Kachel → sichtbar mehr Wiederholungen entlang der Kante */
  const topBottomTile = {
    backgroundImage: `url('${topBottomBorderImage}')`,
    backgroundRepeat: "repeat-x" as const,
    backgroundPosition: "center top",
    backgroundSize: "40px 100%",
  };
  const sideTile = {
    backgroundImage: `url('${leftRightBorderImage}')`,
    backgroundRepeat: "repeat-y" as const,
    backgroundPosition: "left center",
    backgroundSize: "100% 40px",
  };

  return (
    <div className={`relative ${className}`}>
      {/* Rahmen: eigene volle Fläche, unter dem Text – vermeidet Layout-Verschiebung durch flow */}
      <div className="pointer-events-none absolute inset-0 z-[12]">
        <div className={`absolute top-0 left-10 right-10 ${TOP_BOTTOM_STRIP_H}`}>
          <div className="h-full w-full" style={topBottomTile} />
        </div>
        <div className={`absolute bottom-0 left-10 right-10 ${TOP_BOTTOM_STRIP_H}`}>
          <div
            className="h-full w-full"
            style={{
              ...topBottomTile,
              backgroundPosition: "center bottom",
            }}
          />
        </div>
        <div className={`absolute top-10 bottom-10 left-0 ${SIDE_STRIP_W}`}>
          <div className="h-full w-full" style={sideTile} />
        </div>
        <div className={`absolute top-10 bottom-10 right-0 ${SIDE_STRIP_W}`}>
          <div
            className="h-full w-full"
            style={{
              ...sideTile,
              backgroundPosition: "right center",
            }}
          />
        </div>

        <div className={`pointer-events-none absolute left-0 top-0 ${CORNER}`}>
          <Image src={cornerImage} alt="" fill className="object-contain" />
        </div>
        <div className={`pointer-events-none absolute right-0 top-0 ${CORNER}`}>
          <Image
            src={cornerImage}
            alt=""
            fill
            className="object-contain"
            style={{ transform: "scaleX(-1)" }}
          />
        </div>
        <div className={`pointer-events-none absolute bottom-0 left-0 ${CORNER}`}>
          <Image
            src={cornerImage}
            alt=""
            fill
            className="object-contain"
            style={{ transform: "scaleY(-1)" }}
          />
        </div>
        <div className={`pointer-events-none absolute bottom-0 right-0 ${CORNER}`}>
          <Image
            src={cornerImage}
            alt=""
            fill
            className="object-contain"
            style={{ transform: "scale(-1)" }}
          />
        </div>
      </div>

      <div
        className={
          variant === "overlay"
            ? "absolute inset-0 z-[25] box-border p-[25px]"
            : "relative z-[25] min-h-full w-full box-border"
        }
      >
        {children}
      </div>
    </div>
  );
}

