"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

const SHORTCUTS: { section: string; items: { keys: string[]; description: string }[] }[] = [
  {
    section: "General",
    items: [
      { keys: ["?"], description: "Show / hide this shortcuts panel" },
      { keys: ["Ctrl", "Z"], description: "Undo" },
      { keys: ["Ctrl", "Y"], description: "Redo" },
      { keys: ["Ctrl", "E"], description: "Export board as PNG" },
      { keys: ["Escape"], description: "Deselect all / cancel editing" },
    ],
  },
  {
    section: "Selection & Editing",
    items: [
      { keys: ["Click"], description: "Select element" },
      { keys: ["Shift", "Click"], description: "Add / remove from selection" },
      { keys: ["Drag"], description: "Box-select multiple elements" },
      { keys: ["Delete"], description: "Delete selected elements" },
      { keys: ["Ctrl", "C"], description: "Copy selection" },
      { keys: ["Ctrl", "V"], description: "Paste" },
      { keys: ["Ctrl", "D"], description: "Duplicate selection" },
      { keys: ["Dbl-click"], description: "Edit text / frame title / connector label" },
    ],
  },
  {
    section: "Canvas Navigation",
    items: [
      { keys: ["Scroll"], description: "Pan canvas" },
      { keys: ["Ctrl", "Scroll"], description: "Zoom in / out" },
      { keys: ["Pinch"], description: "Zoom (touch)" },
    ],
  },
  {
    section: "View",
    items: [
      { keys: ["Ctrl", "G"], description: "Toggle grid" },
      { keys: ["Ctrl", "Shift", "S"], description: "Toggle snap to grid" },
    ],
  },
  {
    section: "Connectors",
    items: [
      { keys: ["Click connector"], description: "Select connector (shows style toolbar)" },
      { keys: ["Dbl-click connector"], description: "Edit connector label" },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-[#ffe0b2] w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#fff3e0]">
          <h2 className="text-base font-semibold text-[#5d4037]">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#8d6e63] hover:bg-[#fff3e0] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {SHORTCUTS.map((section) => (
            <div key={section.section}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8d6e63] mb-2">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div key={item.description} className="flex items-center justify-between py-1">
                    <span className="text-sm text-[#3e2723]">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      {item.keys.map((key, i) => (
                        <React.Fragment key={i}>
                          <kbd className="inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 text-xs font-medium text-[#5d4037] bg-[#fff8f0] border border-[#ffe0b2] rounded shadow-sm">
                            {key}
                          </kbd>
                          {i < item.keys.length - 1 && (
                            <span className="text-xs text-[#bdb9b4]">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
