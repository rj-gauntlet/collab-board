"use client";

import React from "react";
import { Bold, Italic } from "lucide-react";
import type { TextElement } from "@/features/text-elements/types";

const FONT_SIZES = [10, 12, 14, 16, 20, 24, 32, 48, 64];
const FONT_FAMILIES = ["sans-serif", "serif", "monospace", "Georgia", "Arial", "Verdana"];
const TEXT_COLORS = [
  "#1f2937", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
  "#ffffff", "#6b7280",
];

interface TextFormatBarProps {
  textElement: TextElement;
  x: number; // screen x to position bar
  y: number; // screen y to position bar (above element)
  onUpdate: (updates: Partial<TextElement>) => void;
}

export function TextFormatBar({ textElement, x, y, onUpdate }: TextFormatBarProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: x,
        top: Math.max(4, y - 48),
        zIndex: 10001,
        transform: "translateX(-50%)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="flex items-center gap-1 rounded-xl bg-white shadow-lg border border-[#ffe0b2] px-2 py-1.5"
    >
      {/* Bold */}
      <button
        onClick={() => onUpdate({ bold: !textElement.bold })}
        title="Bold"
        className={`rounded p-1.5 transition-colors ${textElement.bold ? "bg-[#ff8f00] text-white" : "text-[#5d4037] hover:bg-[#fff3e0]"}`}
      >
        <Bold size={14} />
      </button>

      {/* Italic */}
      <button
        onClick={() => onUpdate({ italic: !textElement.italic })}
        title="Italic"
        className={`rounded p-1.5 transition-colors ${textElement.italic ? "bg-[#ff8f00] text-white" : "text-[#5d4037] hover:bg-[#fff3e0]"}`}
      >
        <Italic size={14} />
      </button>

      <div className="w-px h-4 bg-[#ffe0b2] mx-0.5" />

      {/* Font size */}
      <select
        value={textElement.fontSize}
        onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
        className="rounded px-1 py-0.5 text-xs text-[#5d4037] border border-[#ffe0b2] bg-white focus:outline-none"
        title="Font size"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}px</option>
        ))}
      </select>

      {/* Font family */}
      <select
        value={textElement.fontFamily}
        onChange={(e) => onUpdate({ fontFamily: e.target.value })}
        className="rounded px-1 py-0.5 text-xs text-[#5d4037] border border-[#ffe0b2] bg-white focus:outline-none max-w-[90px]"
        title="Font family"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
        ))}
      </select>

      <div className="w-px h-4 bg-[#ffe0b2] mx-0.5" />

      {/* Color swatches */}
      {TEXT_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onUpdate({ fill: color })}
          title={color}
          className="rounded-full w-4 h-4 border transition-transform hover:scale-125"
          style={{
            background: color,
            borderColor: textElement.fill === color ? "#ff8f00" : "#d1d5db",
            borderWidth: textElement.fill === color ? 2 : 1,
          }}
        />
      ))}
    </div>
  );
}
