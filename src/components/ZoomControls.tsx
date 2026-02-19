"use client";

import React from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToScreen: () => void;
}

export function ZoomControls({ scale, onZoomIn, onZoomOut, onReset, onFitToScreen }: ZoomControlsProps) {
  return (
    <div
      className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl bg-white shadow-md border border-[#ffe0b2] px-2 py-1 z-20 select-none"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={onZoomOut}
        title="Zoom out (scroll down)"
        className="rounded-lg p-1.5 text-[#5d4037] hover:bg-[#fff3e0] transition-colors"
      >
        <ZoomOut size={16} />
      </button>
      <button
        onClick={onReset}
        title="Reset zoom to 100%"
        className="min-w-[52px] rounded-lg px-2 py-1 text-xs font-mono font-semibold text-[#5d4037] hover:bg-[#fff3e0] transition-colors"
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        title="Zoom in (scroll up)"
        className="rounded-lg p-1.5 text-[#5d4037] hover:bg-[#fff3e0] transition-colors"
      >
        <ZoomIn size={16} />
      </button>
      <div className="mx-1 w-px h-4 bg-[#ffe0b2]" />
      <button
        onClick={onFitToScreen}
        title="Fit all objects to screen"
        className="rounded-lg p-1.5 text-[#5d4037] hover:bg-[#fff3e0] transition-colors"
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
}
