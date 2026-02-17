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
    <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => onToolChange("hand")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "hand"
            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        }`}
        title="Circle - Click to add"
      >
        <Circle size={18} />
        <span>Circle</span>
      </button>
    </div>
  );
}
