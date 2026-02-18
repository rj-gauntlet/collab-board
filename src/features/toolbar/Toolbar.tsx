"use client";

import React from "react";
import { StickyNote, Square, Triangle, Circle, Hand } from "lucide-react";
import type { Tool } from "./types";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

export function Toolbar({
  activeTool,
  onToolChange,
}: ToolbarProps) {
  return (
    <div className="font-sans flex flex-col gap-1 px-2">
      <button
        type="button"
        onClick={() => onToolChange("hand")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "hand"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Hand Tool - Pan the canvas"
      >
        <Hand size={18} />
        <span>Hand</span>
      </button>
      <button
        type="button"
        onClick={() => onToolChange("sticky-note")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "sticky-note"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Sticky Note Tool"
      >
        <StickyNote size={18} />
        <span>Note</span>
      </button>
      <button
        type="button"
        onClick={() => onToolChange("rect")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "rect"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Rectangle - Click to add"
      >
        <Square size={18} />
        <span>Rect</span>
      </button>
      <button
        type="button"
        onClick={() => onToolChange("triangle")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "triangle"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Triangle - Click to add"
      >
        <Triangle size={18} />
        <span>Triangle</span>
      </button>
      <button
        type="button"
        onClick={() => onToolChange("circle")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "circle"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Circle - Click to add"
      >
        <Circle size={18} />
        <span>Circle</span>
      </button>
    </div>
  );
}
