"use client";

import React from "react";
import { Pencil, StickyNote, Sparkles } from "lucide-react";
import type { Tool } from "./types";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onMagicClick?: () => void;
  isMagicLoading?: boolean;
}

export function Toolbar({
  activeTool,
  onToolChange,
  onMagicClick,
  isMagicLoading = false,
}: ToolbarProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => onToolChange("pen")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          activeTool === "pen"
            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        }`}
        title="Pen Tool"
      >
        <Pencil size={18} />
        <span>Pen</span>
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
      {onMagicClick && (
        <button
          type="button"
          onClick={onMagicClick}
          disabled={isMagicLoading}
          className="flex items-center gap-2 rounded-md bg-violet-100 px-3 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-200 disabled:opacity-50 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50"
          title="Smart Cluster - Categorize notes into themes"
        >
          {isMagicLoading ? (
            <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-violet-300 border-t-violet-600 dark:border-violet-600 dark:border-t-violet-400" />
          ) : (
            <Sparkles size={18} />
          )}
          <span>Magic</span>
        </button>
      )}
    </div>
  );
}
