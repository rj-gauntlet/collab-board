"use client";

import { usePerformanceMetrics } from "./usePerformanceMetrics";

interface PerformanceMonitorProps {
  visible: boolean;
}

export function PerformanceMonitor({ visible }: PerformanceMonitorProps) {
  const { fps, frameMs } = usePerformanceMetrics(visible);

  if (!visible) return null;

  return (
    <div
      className="rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 font-mono text-xs text-white backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <span className="font-medium">FPS:</span> {fps}
      <span className="mx-2 text-white/70">|</span>
      <span className="font-medium">Latency:</span> {frameMs.toFixed(1)}ms
    </div>
  );
}
