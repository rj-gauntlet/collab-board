"use client";

import { useCallback, useState } from "react";
import { clusterNotesIntoThemes } from "@/app/actions/ai";
import type { StickyNoteElement } from "@/features/sticky-notes";

const THEME_COLORS = [
  "#a78bfa", // purple
  "#c084fc", // violet
  "#e879f9", // fuchsia
  "#d8b4fe", // light purple
];

export interface SmartClusterResult {
  text: string;
  color: string;
  x: number;
  y: number;
}

export type SmartClusterMessage =
  | { type: "empty"; text: string }
  | { type: "error"; text: string }
  | { type: "success"; text: string }
  | null;

const NOTE_HEIGHT = 120;

export function useSmartCluster(
  getNotes: () => StickyNoteElement[],
  createNotes: (notes: SmartClusterResult[]) => void,
  canvasSize: { width: number; height: number }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<SmartClusterMessage>(null);

  const runSmartCluster = useCallback(async () => {
    setMessage(null);

    const notes = getNotes();
    const noteTexts = notes
      .filter((n) => n.type === "sticky-note" && n.text?.trim?.().length > 0)
      .map((n) => n.text.trim());

    if (noteTexts.length === 0) {
      setMessage({
        type: "empty",
        text: "No sticky notes with text found. Double-click each note to add text, then try again.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const themes = await clusterNotesIntoThemes(noteTexts);

      if (themes.length === 0) {
        setMessage({ type: "error", text: "Could not generate themes." });
        return;
      }

      const bottomOfNotes =
        notes.length > 0 ? Math.max(...notes.map((n) => n.y + n.height)) : 0;
      const targetY = bottomOfNotes + 40;
      const maxVisibleY = canvasSize.height - NOTE_HEIGHT - 20;
      const y = Math.min(targetY, Math.max(20, maxVisibleY));

      const startX = 50;
      const spacing = 20;
      const noteWidth = 160;

      const themeNotes: SmartClusterResult[] = themes.map((theme, i) => ({
        text: `${theme.title}\n\n${theme.summary}`,
        color: THEME_COLORS[i % THEME_COLORS.length],
        x: startX + i * (noteWidth + spacing),
        y,
      }));

      createNotes(themeNotes);
      setMessage({
        type: "success",
        text: `Created ${themeNotes.length} theme note${themeNotes.length > 1 ? "s" : ""} below your notes.`,
      });
    } catch (err) {
      console.error("Smart Cluster failed:", err);
      setMessage({
        type: "error",
        text: "Failed to categorize. Check your OPENAI_API_KEY and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getNotes, createNotes, canvasSize]);

  return { runSmartCluster, isLoading, message, clearMessage: () => setMessage(null) };
}
