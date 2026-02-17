"use client";

import React, { useEffect, useRef } from "react";

/** 16 sticky-note-appropriate colors (pastels and classic note colors) */
export const STICKY_NOTE_PALETTE = [
  "#fef08a", // yellow
  "#fef9c3", // light yellow
  "#fde047", // golden
  "#facc15", // amber
  "#fef3c7", // amber light
  "#fed7aa", // peach
  "#fdba74", // orange light
  "#fecaca", // rose light
  "#fda4af", // pink
  "#fbcfe8", // pink light
  "#e9d5ff", // violet light
  "#ddd6fe", // purple light
  "#c7d2fe", // indigo light
  "#bfdbfe", // blue light
  "#a5f3fc", // cyan light
  "#a7f3d0", // emerald light
];

interface ColorPaletteMenuProps {
  clientX: number;
  clientY: number;
  onSelect: (color: string) => void;
  onClose: () => void;
  /** For shapes: also set stroke to a darker variant of fill */
  forShape?: boolean;
}

/** Returns a darker stroke color for a given fill (for shapes) */
function strokeForFill(fill: string): string {
  const hex = fill.replace("#", "");
  const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - 60);
  const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - 60);
  const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - 60);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function ColorPaletteMenu({
  clientX,
  clientY,
  onSelect,
  onClose,
  forShape = false,
}: ColorPaletteMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
      style={{
        left: Math.min(clientX, typeof window !== "undefined" ? window.innerWidth - 180 : clientX),
        top: Math.min(clientY, typeof window !== "undefined" ? window.innerHeight - 120 : clientY),
      }}
      role="menu"
      aria-label="Choose color"
    >
      <div className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {forShape ? "Shape color" : "Note color"}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {STICKY_NOTE_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            className="h-8 w-8 rounded border-2 border-zinc-200 transition-transform hover:scale-110 dark:border-zinc-600"
            style={{ backgroundColor: color }}
            onClick={() => onSelect(color)}
            title={color}
            role="menuitem"
          />
        ))}
      </div>
    </div>
  );
}

export function getShapeStrokeForFill(fill: string): string {
  return strokeForFill(fill);
}
