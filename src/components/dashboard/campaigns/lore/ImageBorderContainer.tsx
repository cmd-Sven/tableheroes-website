"use client";

import Image from "next/image";

type Props = {
  children: React.ReactNode;
  className?: string;
  cornerImage?: string;
  topBottomBorderImage?: string;
  leftRightBorderImage?: string;
};

export function ImageBorderContainer({
  children,
  className = "",
  cornerImage = "/images/corner_dragon.jpg",
  topBottomBorderImage = "/images/border_top-bottom_gold.png",
  leftRightBorderImage = "/images/border_left-right_gold.png",
}: Props) {
  return (
    <div className={`relative ${className}`}>
      {/* Content */}
      <div className="relative z-10 p-[25px]">{children}</div>

      {/* Top Border - positioned after corners to overlap */}
      <div className="absolute top-0 left-8 right-8 h-4 z-20 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url('${topBottomBorderImage}')`,
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "top center",
          }}
        />
      </div>

      {/* Bottom Border - positioned after corners to overlap */}
      <div className="absolute bottom-0 left-8 right-8 h-4 z-20 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url('${topBottomBorderImage}')`,
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "bottom center",
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

