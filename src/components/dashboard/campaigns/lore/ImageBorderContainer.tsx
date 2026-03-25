"use client";

import NextImage from "next/image";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** overlay: Hero über Bild (füllt per absolute). block: Lore ohne Bild – Höhe folgt dem Inhalt. */
  variant?: "overlay" | "block";
  cornerImage?: string;
  topBottomBorderImage?: string;
  leftRightBorderImage?: string;
};

/** Ecken h-12 → Streifen-Inset left/right/top/bottom = 12 (3rem) */
const CORNER = "h-12 w-12";
const TOP_BOTTOM_STRIP_H = "h-4";
const SIDE_STRIP_W = "w-2";

export function ImageBorderContainer({
  children,
  className = "",
  variant = "block",
  cornerImage = "/images/corner_dragon.jpg",
  topBottomBorderImage = "/images/border_top-bottom_gold.png",
  leftRightBorderImage = "/images/border_left-right_gold.png",
}: Props) {
  const topBottomTile = {
    backgroundImage: `url('${topBottomBorderImage}')`,
    backgroundRepeat: "repeat-x" as const,
    backgroundPosition: "center top",
    backgroundSize: "28px 100%",
  };
  const sideTile = {
    backgroundImage: `url('${leftRightBorderImage}')`,
    backgroundRepeat: "repeat-y" as const,
    backgroundPosition: "left center",
    backgroundSize: "100% 28px",
  };

  /* h-12 w-12 = inset-12 für Lücken zwischen Streifen und Ecken */
  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-0 z-[12]">
        {/* Streifen unter den Ecken (z-0), Ecken oben drauf (z-10) */}
        <div className="absolute inset-0 z-0">
          <div className={`absolute top-0 left-12 right-12 ${TOP_BOTTOM_STRIP_H}`}>
            <div className="h-full w-full" style={topBottomTile} />
          </div>
          <div className={`absolute bottom-0 left-12 right-12 ${TOP_BOTTOM_STRIP_H}`}>
            <div
              className="h-full w-full"
              style={{
                ...topBottomTile,
                backgroundPosition: "center bottom",
              }}
            />
          </div>
          <div className={`absolute top-12 bottom-12 left-0 ${SIDE_STRIP_W}`}>
            <div className="h-full w-full" style={sideTile} />
          </div>
          <div className={`absolute top-12 bottom-12 right-0 ${SIDE_STRIP_W}`}>
            <div
              className="h-full w-full"
              style={{
                ...sideTile,
                backgroundPosition: "right center",
              }}
            />
          </div>
        </div>

        <div className={`absolute left-0 top-0 z-10 ${CORNER}`}>
          <NextImage
            src={cornerImage}
            alt=""
            width={48}
            height={48}
            className="pointer-events-none h-full w-full object-contain select-none"
            sizes="48px"
          />
        </div>
        <div className={`absolute right-0 top-0 z-10 ${CORNER}`}>
          <NextImage
            src={cornerImage}
            alt=""
            width={48}
            height={48}
            className="pointer-events-none h-full w-full object-contain select-none"
            style={{ transform: "scaleX(-1)" }}
            sizes="48px"
          />
        </div>
        <div className={`absolute bottom-0 left-0 z-10 ${CORNER}`}>
          <NextImage
            src={cornerImage}
            alt=""
            width={48}
            height={48}
            className="pointer-events-none h-full w-full object-contain select-none"
            style={{ transform: "scaleY(-1)" }}
            sizes="48px"
          />
        </div>
        <div className={`absolute bottom-0 right-0 z-10 ${CORNER}`}>
          <NextImage
            src={cornerImage}
            alt=""
            width={48}
            height={48}
            className="pointer-events-none h-full w-full object-contain select-none"
            style={{ transform: "scale(-1)" }}
            sizes="48px"
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

