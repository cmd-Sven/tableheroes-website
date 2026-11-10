import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Marmor-Card mit Gold-Rahmen und Ecken für Login/Signup.
 * Hintergrund: /images/dark-marmor (im image-Ordner), Rahmen & Ecken wie definiert.
 */
export function LoginCardFrame({ children }: Props) {
  return (
    <div
      className="relative z-30 overflow-hidden rounded-sm w-full max-w-md mx-auto"
      style={{
        backgroundImage: "url('/images/dark-marmor.webp')",
        backgroundSize: "cover",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Gold-Rahmen läuft unter die freigestellten Ecken durch */}
      <div
        className="absolute left-0 right-0 top-0 z-[1] h-4"
        style={{
          backgroundImage: "url('/images/border_top-bottom_gold.webp')",
          backgroundRepeat: "repeat-x",
          backgroundSize: "40px 16px",
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 z-[1] h-4"
        style={{
          backgroundImage: "url('/images/border_top-bottom_gold.webp')",
          backgroundRepeat: "repeat-x",
          backgroundSize: "40px 16px",
        }}
      />
      <div
        className="absolute left-0 top-0 bottom-0 z-[1] w-4"
        style={{
          backgroundImage: "url('/images/border_left-right_gold.webp')",
          backgroundRepeat: "repeat-y",
          backgroundSize: "16px 48px",
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 z-[1] w-4"
        style={{
          backgroundImage: "url('/images/border_left-right_gold.webp')",
          backgroundRepeat: "repeat-y",
          backgroundSize: "16px 48px",
        }}
      />
      {/* Freigestellte Ecken über den Leisten */}
      <div
        className="absolute top-0 left-0 z-10 h-[78px] w-[78px] bg-contain bg-left-top bg-no-repeat"
        style={{ backgroundImage: "url('/images/corner-dragon-only.webp')" }}
      />
      <div
        className="absolute bottom-0 left-0 z-10 h-[78px] w-[78px] bg-contain bg-left-bottom bg-no-repeat"
        style={{ backgroundImage: "url('/images/corner-claw-only.webp')" }}
      />
      <div
        className="absolute top-0 right-0 z-10 h-[78px] w-[78px] scale-y-[-1] bg-contain bg-left-top bg-no-repeat"
        style={{ backgroundImage: "url('/images/skull-corner-only.webp')" }}
      />
      <div
        className="absolute bottom-0 right-0 z-10 h-[78px] w-[78px] bg-contain bg-left-bottom bg-no-repeat"
        style={{ backgroundImage: "url('/images/skull-corner-only.webp')" }}
      />
      <div className="relative p-8 pt-10 pb-10 pl-10 pr-10">{children}</div>
    </div>
  );
}
