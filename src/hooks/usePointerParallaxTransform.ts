"use client";

import { useEffect, useRef } from "react";

import { bindPointerParallax, isMobileViewport } from "@/lib/pointer-parallax";

interface UsePointerParallaxTransformOptions {
  rotateYFactor?: number;
  rotateXFactor?: number;
  perspective?: string;
  enabled?: boolean;
}

export function usePointerParallaxTransform(
  options: UsePointerParallaxTransformOptions = {},
) {
  const {
    rotateYFactor = 5,
    rotateXFactor = 4,
    perspective = "1200px",
    enabled = true,
  } = options;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    return bindPointerParallax((x, y) => {
      const el = ref.current;
      if (!el) return;

      const mobile = isMobileViewport();
      const yFactor = mobile ? rotateYFactor * 0.45 : rotateYFactor;
      const xFactor = mobile ? rotateXFactor * 0.45 : rotateXFactor;

      el.style.transform = [
        `perspective(${perspective})`,
        `rotateY(${x * yFactor}deg)`,
        `rotateX(${-y * xFactor}deg)`,
        "translateZ(0)",
      ].join(" ");
    });
  }, [enabled, perspective, rotateXFactor, rotateYFactor]);

  return ref;
}
