import Image from "next/image";
import type { ReactNode } from "react";

const BORDER_X = "/images/border_top-bottom_gold.webp";
const BORDER_Y = "/images/border_left-right_gold.webp";

type Density = "panel" | "card" | "rail";

const SPEC = {
  panel: { corner: 48, edgeX: 14, edgeY: 12 },
  card: { corner: 36, edgeX: 12, edgeY: 10 },
  rail: { corner: 0, edgeX: 8, edgeY: 8 },
} as const;

type ChromeProps = {
  density?: Density;
};

function Corner({
  src,
  width,
  height,
  className,
  size,
}: {
  src: string;
  width: number;
  height: number;
  className: string;
  size: number;
}) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        sizes={`${size}px`}
        className="h-full w-full object-cover"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

/** Goldleisten und Ecken der Landingpage. Liegt über dem Panel, fängt keine Klicks. */
export function CityHudChrome({ density = "panel" }: ChromeProps) {
  const { corner, edgeX, edgeY } = SPEC[density];
  const showCorners = corner > 0;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
      <div
        className="absolute top-0"
        style={{
          left: corner,
          right: corner,
          height: edgeX,
          backgroundImage: `url('${BORDER_X}')`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 100%",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute bottom-0"
        style={{
          left: corner,
          right: corner,
          height: edgeX,
          backgroundImage: `url('${BORDER_X}')`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 100%",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute left-0"
        style={{
          top: corner,
          bottom: corner,
          width: edgeY,
          backgroundImage: `url('${BORDER_Y}')`,
          backgroundRepeat: "repeat-y",
          backgroundSize: "100% auto",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute right-0"
        style={{
          top: corner,
          bottom: corner,
          width: edgeY,
          backgroundImage: `url('${BORDER_Y}')`,
          backgroundRepeat: "repeat-y",
          backgroundSize: "100% auto",
          backgroundPosition: "center",
        }}
      />
      {showCorners ? (
        <>
          <Corner
            src="/images/corner-dragon-only.webp"
            width={243}
            height={247}
            size={corner}
            className="absolute left-0 top-0"
          />
          <Corner
            src="/images/corner-claw-only.webp"
            width={240}
            height={240}
            size={corner}
            className="absolute bottom-0 left-0"
          />
          <Corner
            src="/images/skull-corner-only.webp"
            width={158}
            height={166}
            size={corner}
            className="absolute right-0 top-0 scale-y-[-1]"
          />
          <Corner
            src="/images/skull-corner-only.webp"
            width={158}
            height={166}
            size={corner}
            className="absolute bottom-0 right-0"
          />
        </>
      ) : null}
    </div>
  );
}

type FrameProps = {
  children: ReactNode;
  className?: string;
  density?: Density;
  tone?: "card" | "dark";
};

export function CityHudFrame({ children, className = "", density = "card", tone = "card" }: FrameProps) {
  const bg = tone === "dark" ? "bg-background-dark" : "bg-background-card";
  return (
    <div className={`relative ${bg} ${className}`}>
      <CityHudChrome density={density} />
      {children}
    </div>
  );
}
