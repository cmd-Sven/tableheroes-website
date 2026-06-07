"use client";

import Link from "next/link";

export function SubNavbar() {
  return (
    <nav
      className="relative w-full overflow-hidden"
      style={{
        backgroundImage: "url('/images/dark-marmor.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 z-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "url('/images/border_top-bottom_gold.png')",
            backgroundSize: "100px auto",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "top center",
          }}
        />
      </div>

      <div className="relative mx-auto flex max-w-6xl items-center justify-center gap-4 px-6 py-5 sm:gap-5 sm:py-6">
        <Link href="/login" className="marketing-nav-btn-primary">
          Registrieren / Login
        </Link>
        <Link
          href="https://discord.gg/JzfXw9b7v7"
          target="_blank"
          rel="noopener noreferrer"
          className="marketing-nav-btn-discord"
        >
          Zum Discord
        </Link>
      </div>

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
    </nav>
  );
}
