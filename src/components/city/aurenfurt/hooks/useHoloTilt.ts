"use client";

import { useCallback, useState } from "react";

/** Leichte 3D-Neigung der Karte zur Maus, ohne Layout zu verschieben. */
export function useHoloTilt(maxDeg = 8) {
  const [tilt, setTilt] = useState({ rotateX: 8, rotateY: -6 });

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt({
        rotateX: -py * maxDeg * 2,
        rotateY: px * maxDeg * 2,
      });
    },
    [maxDeg],
  );

  const reset = useCallback(() => setTilt({ rotateX: 8, rotateY: -6 }), []);

  return { tilt, onPointerMove, reset };
}
