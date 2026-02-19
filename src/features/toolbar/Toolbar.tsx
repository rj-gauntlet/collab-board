"use client";

import React from "react";
import { StickyNote, Square, Triangle, Circle, Hand, MousePointer2, Trash2, Link2, Type, Layout } from "lucide-react";
import type { Tool } from "./types";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  hasSelection?: boolean;
  onDeleteSelection?: () => void;
}

export function Toolbar({
  activeTool,
  onToolChange,
  hasSelection = false,
  onDeleteSelection,
}: ToolbarProps) {
  return (
    <div className="font-sans flex flex-col gap-1 px-2">
      {hasSelection && onDeleteSelection && (
        <button
          type="button"
          onClick={onDeleteSelection}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
          title="Delete selected"
        >
          <Trash2 size={18} />
          <span>Delete</span>
        </button>
      )}
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
        onClick={() => onToolChange("select")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "select"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Select - Shift+click to multi-select, drag to select area"
      >
        <MousePointer2 size={18} />
        <span>Select</span>
      </button>
      <button
        type="button"
        onClick={() => onToolChange("connector")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "connector"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Connector - Click first object, then second to draw a line/arrow"
      >
        <Link2 size={18} />
        <span>Connector</span>
      </button>
      <button
        type="button"
        onClick={() => onToolChange("text")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "text"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Text - Click to add standalone text"
      >
        <Type size={18} />
        <span>Text</span>
      </button>
      <button
        type="button"
        onClick={() => onToolChange("frame")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "frame"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Frame - Click to add a frame to group content"
      >
        <Layout size={18} />
        <span>Frame</span>
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
