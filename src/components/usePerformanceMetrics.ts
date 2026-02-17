"use client";

import { useState, useEffect, useRef } from "react";

const SAMPLE_MS = 500;

export function usePerformanceMetrics(enabled: boolean) {
  const [fps, setFps] = useState(0);
  const [frameMs, setFrameMs] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const measure = () => {
      frameCountRef.current += 1;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= SAMPLE_MS) {
        const measuredFps = Math.round(
          (frameCountRef.current * 1000) / elapsed
        );
        setFps(measuredFps);
        setFrameMs(elapsed / frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafRef.current = requestAnimationFrame(measure);
    };

    rafRef.current = requestAnimationFrame(measure);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled]);

  return { fps, frameMs };
}
