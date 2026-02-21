"use client";

import React, { useState } from "react";
import {
  StickyNote,
  Square,
  Triangle,
  Circle,
  Hand,
  MousePointer2,
  Trash2,
  Link2,
  Type,
  Layout,
  Undo2,
  Redo2,
  Download,
  Grid3X3,
  Magnet,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Workflow,
} from "lucide-react";
import type { Tool } from "./types";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  hasSelection?: boolean;
  onDeleteSelection?: () => void;
  /** View & actions (Option 7: moved from header) */
  onUndo?: () => void;
  onRedo?: () => void;
  onExport?: () => void;
  gridVisible?: boolean;
  onGridToggle?: () => void;
  snapEnabled?: boolean;
  onSnapToggle?: () => void;
  onCluster?: () => void;
  clusterLoading?: boolean;
  /** Create a flowchart template (frame + notes + connectors) at viewport center. */
  onCreateFlowchart?: () => void;
}

export function Toolbar({
  activeTool,
  onToolChange,
  hasSelection = false,
  onDeleteSelection,
  onUndo,
  onRedo,
  onExport,
  gridVisible = false,
  onGridToggle,
  snapEnabled = false,
  onSnapToggle,
  onCluster,
  clusterLoading = false,
  onCreateFlowchart,
}: ToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="font-sans flex flex-col items-center px-1">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex flex-col items-center gap-0.5 rounded-md px-2 py-2 text-[#5d4037] transition-colors hover:bg-[#ffe0b2]"
          title="Expand toolbar"
          aria-label="Expand toolbar"
        >
          <PanelLeft size={20} />
          <span className="text-xs font-medium">Tools</span>
        </button>
      </div>
    );
  }

  return (
    <div className="font-sans flex flex-col gap-1 px-1">
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="flex items-center justify-center rounded-md p-1.5 text-[#5d4037] transition-colors hover:bg-[#ffe0b2] self-start"
        title="Collapse toolbar"
        aria-label="Collapse toolbar"
      >
        <PanelLeftClose size={18} />
      </button>
      {hasSelection && onDeleteSelection && (
        <button
          type="button"
          onClick={onDeleteSelection}
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
          title="Delete selected"
        >
          <Trash2 size={18} />
          <span>Delete</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => onToolChange("hand")}
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
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
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
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
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
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
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
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
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
          activeTool === "frame"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Frame - Click to add a frame to group content"
      >
        <Layout size={18} />
        <span>Frame</span>
      </button>
      {onCreateFlowchart && (
        <button
          type="button"
          onClick={onCreateFlowchart}
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-[#5d4037] transition-colors hover:bg-[#ffe0b2]"
          title="Flowchart - Add a frame with sticky notes and connectors"
        >
          <Workflow size={18} />
          <span>Flowchart</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => onToolChange("sticky-note")}
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
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
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
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
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
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
        className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
          activeTool === "circle"
            ? "bg-[#ff8f00] text-white"
            : "text-[#5d4037] hover:bg-[#ffe0b2]"
        }`}
        title="Circle - Click to add"
      >
        <Circle size={18} />
        <span>Circle</span>
      </button>

      {/* View & actions — moved from header (Option 7) */}
      {(onUndo != null || onRedo != null || onExport != null || onGridToggle != null || onSnapToggle != null || onCluster != null) && (
        <>
          <div className="my-2 border-t border-[#ffe0b2]" aria-hidden />
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-[#5d4037] transition-colors hover:bg-[#ffe0b2]"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} />
              <span>Undo</span>
            </button>
          )}
          {onRedo && (
            <button
              type="button"
              onClick={onRedo}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-[#5d4037] transition-colors hover:bg-[#ffe0b2]"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={18} />
              <span>Redo</span>
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-[#5d4037] transition-colors hover:bg-[#ffe0b2]"
              title="Export as PNG"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
          )}
          {onGridToggle && (
            <button
              type="button"
              onClick={onGridToggle}
              className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                gridVisible ? "bg-[#ff8f00] text-white" : "text-[#5d4037] hover:bg-[#ffe0b2]"
              }`}
              title="Toggle grid"
            >
              <Grid3X3 size={18} />
              <span>Grid</span>
            </button>
          )}
          {onSnapToggle && (
            <button
              type="button"
              onClick={onSnapToggle}
              className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                snapEnabled ? "bg-[#ff8f00] text-white" : "text-[#5d4037] hover:bg-[#ffe0b2]"
              }`}
              title="Snap to grid"
            >
              <Magnet size={18} />
              <span>Snap</span>
            </button>
          )}
          {onCluster && (
            <button
              type="button"
              onClick={onCluster}
              disabled={clusterLoading}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-[#5d4037] transition-colors hover:bg-[#ffe0b2] disabled:opacity-60 disabled:cursor-not-allowed"
              title="Cluster sticky note text into themes (AI)"
            >
              {clusterLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#ffe0b2] border-t-[#ff8f00]" />
              ) : (
                <Sparkles size={18} />
              )}
              <span>{clusterLoading ? "Cluster…" : "Cluster"}</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
