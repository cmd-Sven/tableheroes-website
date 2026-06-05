"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Rendert Kinder erst nach Client-Mount.
 * Verhindert Hydration-Mismatch, wenn Browser-Extensions (z. B. Dashlane, LastPass)
 * Attribute in Formularfelder injizieren, bevor React hydriert.
 */
export function ClientMountGate({ children, fallback = null }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return fallback;
  return children;
}
