"use client";

import React from "react";
import type { ConnectorElement } from "@/features/connectors/types";

const STROKE_WIDTHS = [1, 2, 3, 5];
const STROKE_COLORS = [
  "#5d4037", "#1f2937", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
];

interface ConnectorStyleBarProps {
  connector: ConnectorElement;
  onUpdate: (updates: Partial<ConnectorElement>) => void;
  onDelete: () => void;
}

export function ConnectorStyleBar({ connector, onUpdate, onDelete }: ConnectorStyleBarProps) {
  const isArrow = connector.style === "arrow";
  const isDashed = connector.dashed ?? false;
  const isCurved = connector.curved ?? false;
  const isBidir = connector.bidirectional ?? false;
  const strokeWidth = connector.strokeWidth ?? 2;

  return (
    <div
      className="flex items-center gap-1 rounded-xl bg-white shadow-lg border border-[#ffe0b2] px-2 py-1.5 select-none"
      onMouseDown={(e) => e.stopPropagation()}
      style={{ pointerEvents: "auto" }}
    >
      {/* Arrow vs line toggle */}
      <div className="flex items-center gap-0.5" title="Line type">
        <button
          onClick={() => onUpdate({ style: "line" })}
          title="Line (no arrow)"
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${!isArrow ? "bg-[#ff8f00] text-white" : "text-[#5d4037] hover:bg-[#fff3e0]"}`}
        >
          ——
        </button>
        <button
          onClick={() => onUpdate({ style: "arrow" })}
          title="Arrow"
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${isArrow ? "bg-[#ff8f00] text-white" : "text-[#5d4037] hover:bg-[#fff3e0]"}`}
        >
          →
        </button>
      </div>

      <div className="w-px h-4 bg-[#ffe0b2] mx-0.5" />

      {/* Dashed toggle */}
      <button
        onClick={() => onUpdate({ dashed: !isDashed })}
        title={isDashed ? "Solid line" : "Dashed line"}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${isDashed ? "bg-[#ff8f00] text-white" : "text-[#5d4037] hover:bg-[#fff3e0]"}`}
        style={{ letterSpacing: 1 }}
      >
        - -
      </button>

      {/* Curved toggle */}
      <button
        onClick={() => onUpdate({ curved: !isCurved })}
        title={isCurved ? "Straight line" : "Curved line"}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${isCurved ? "bg-[#ff8f00] text-white" : "text-[#5d4037] hover:bg-[#fff3e0]"}`}
      >
        ⌒
      </button>

      {/* Bidirectional toggle (only meaningful for arrow style) */}
      <button
        onClick={() => onUpdate({ bidirectional: !isBidir })}
        title={isBidir ? "One-directional" : "Bidirectional"}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${isBidir ? "bg-[#ff8f00] text-white" : "text-[#5d4037] hover:bg-[#fff3e0]"}`}
      >
        ↔
      </button>

      <div className="w-px h-4 bg-[#ffe0b2] mx-0.5" />

      {/* Stroke width */}
      {STROKE_WIDTHS.map((w) => (
        <button
          key={w}
          onClick={() => onUpdate({ strokeWidth: w })}
          title={`Stroke width ${w}px`}
          className={`rounded p-1.5 transition-colors ${strokeWidth === w ? "bg-[#ff8f00]" : "hover:bg-[#fff3e0]"}`}
        >
          <div
            style={{
              width: 16,
              height: w,
              background: strokeWidth === w ? "white" : "#5d4037",
              borderRadius: w / 2,
            }}
          />
        </button>
      ))}

      <div className="w-px h-4 bg-[#ffe0b2] mx-0.5" />

      {/* Color swatches */}
      {STROKE_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onUpdate({ stroke: color })}
          title={color}
          className="rounded-full w-4 h-4 border transition-transform hover:scale-125"
          style={{
            background: color,
            borderColor: connector.stroke === color ? "#ff8f00" : "#d1d5db",
            borderWidth: connector.stroke === color ? 2 : 1,
          }}
        />
      ))}

      <div className="w-px h-4 bg-[#ffe0b2] mx-0.5" />

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Delete connector"
        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
