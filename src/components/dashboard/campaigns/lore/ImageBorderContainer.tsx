"use client";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** overlay: Hero über Bild (füllt per absolute). block: Lore ohne Bild – Höhe folgt dem Inhalt. */
  variant?: "overlay" | "block";
};

export function ImageBorderContainer({
  children,
  className = "",
  variant = "block",
}: Props) {
  return (
    <div className={`relative ${className}`}>
      <div
        className={
          variant === "overlay"
            ? "absolute inset-0 z-10 box-border p-[25px]"
            : "relative z-10 min-h-full w-full box-border"
        }
      >
        {children}
      </div>
    </div>
  );
}
