/**
 * useTemporaryStageGlow — Shows entry glow on stage cards for ~4s after mount.
 */
"use client";

import { useEffect, useState } from "react";

export function useTemporaryStageGlow() {
  const [showGlow, setShowGlow] = useState(true);

  useEffect(() => {
    setShowGlow(true);
    const timeout = window.setTimeout(() => setShowGlow(false), 4000);
    return () => window.clearTimeout(timeout);
  }, []);

  return showGlow;
}
