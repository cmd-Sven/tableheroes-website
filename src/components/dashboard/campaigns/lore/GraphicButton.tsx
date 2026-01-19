"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Props = {
  href: string;
  children: React.ReactNode;
  imagePath: string;
  hoverImagePath: string;
  className?: string;
  width?: number;
  height?: number;
};

export function GraphicButton({ 
  href, 
  children, 
  imagePath, 
  hoverImagePath, 
  className = "",
  width = 192,
  height = 48
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      className={`relative block transition-opacity duration-300 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Background Images with smooth transition */}
      <div className="relative w-full h-full">
        {/* Normal Image */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            isHovered ? "opacity-0" : "opacity-100"
          }`}
        >
          <Image
            src={imagePath}
            alt=""
            fill
            className="object-cover"
            priority
            sizes={`${width}px`}
          />
        </div>
        {/* Hover Image */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={hoverImagePath}
            alt=""
            fill
            className="object-cover"
            priority
            sizes={`${width}px`}
          />
        </div>
        {/* Text Overlay - Centered */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="font-barlow font-bold uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center px-4 whitespace-nowrap">
            {children}
          </span>
        </div>
      </div>
    </Link>
  );
}

