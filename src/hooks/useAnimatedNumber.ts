"use client";

import { useEffect, useRef, useState } from "react";

interface UseAnimatedNumberOptions {
  duration?: number;
  enabled?: boolean;
}

export function useAnimatedNumber(
  from: number,
  to: number,
  { duration = 1400, enabled = false }: UseAnimatedNumberOptions = {},
) {
  const [value, setValue] = useState(enabled ? from : to);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setValue(to);
      return;
    }

    const start = from;
    const diff = to - start;
    if (diff === 0) {
      setValue(to);
      return;
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    setValue(start);
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [from, to, duration, enabled]);

  return value;
}
