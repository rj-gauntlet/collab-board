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
      className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300"
      role="status"
      aria-live="polite"
    >
      <span className="font-medium">FPS:</span> {fps}
      <span className="mx-2 text-zinc-400">|</span>
      <span className="font-medium">Latency:</span> {frameMs.toFixed(1)}ms
    </div>
  );
}
