"use client";

import Image from "next/image";
import { ReactNode } from "react";

interface HeroButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  form?: string;
  className?: string;
  ariaLabel?: string;
  target?: "_blank" | "_self";
  rel?: string;
  size?: "sm" | "md" | "lg";
}

export function HeroButton({
  children,
  href,
  onClick,
  type = "button",
  className = "",
  ariaLabel,
  target,
  rel,
  form,
  size = "md",
}: HeroButtonProps) {
  const baseClasses = "group relative inline-flex items-center justify-center";
  const combinedClasses = `${baseClasses} ${className}`;

  const sizeClasses =
    size === "sm"
      ? "w-[160px] sm:w-[180px] md:w-[200px]"
      : size === "lg"
      ? "w-[240px] sm:w-[260px] md:w-[280px]"
      : "w-[200px] sm:w-[240px] md:w-[260px]";

  const buttonContent = (
    <div className={`relative ${sizeClasses}`}>
      <Image
        src="/images/button-green-wood.png"
        alt=""
        width={260}
        height={80}
        priority={false}
        className="w-full h-auto"
        style={{ height: "auto" }}
      />
      <Image
        src="/images/button-green-wood_hover.png"
        alt=""
        width={260}
        height={80}
        priority={false}
        className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 w-full h-auto"
        style={{ height: "auto" }}
      />
      <span
        className="absolute inset-0 flex items-center justify-center font-barlow font-bold uppercase tracking-wide text-white text-xs sm:text-sm md:text-base"
        style={{ padding: "10px" }}
      >
        {children}
      </span>
    </div>
  );

  // Wenn href vorhanden ist, rendere einen Link
  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        target={target}
        rel={rel}
        className={combinedClasses}
        aria-label={ariaLabel}
      >
        {buttonContent}
      </a>
    );
  }

  // Ansonsten rendere einen Button
  return (
    <button
      type={type}
      onClick={onClick}
      className={combinedClasses}
        form={form}
      aria-label={ariaLabel}
    >
      {buttonContent}
    </button>
  );
}
