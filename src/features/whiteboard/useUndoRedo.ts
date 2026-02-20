"use client";

import { useCallback, useRef } from "react";
import type { StickyNoteElement } from "@/features/sticky-notes";
import type { ShapeElement } from "@/features/shapes";
import type { TextElement } from "@/features/text-elements";
import type { FrameElement } from "@/features/frames";

export interface BoardSnapshot {
  notes: StickyNoteElement[];
  shapes: ShapeElement[];
  textElements: TextElement[];
  frames: FrameElement[];
}

const MAX_HISTORY = 50;

export function useUndoRedo(onRestore: (snapshot: BoardSnapshot) => void) {
  const pastRef = useRef<BoardSnapshot[]>([]);
  const futureRef = useRef<BoardSnapshot[]>([]);
  // Debounce: ignore rapid consecutive pushes (e.g. mid-drag updates)
  const lastPushRef = useRef<number>(0);

  const push = useCallback((snapshot: BoardSnapshot) => {
    const now = Date.now();
    if (now - lastPushRef.current < 300) return; // debounce 300 ms
    lastPushRef.current = now;
    pastRef.current = [...pastRef.current.slice(-MAX_HISTORY + 1), snapshot];
    futureRef.current = []; // clear redo stack on new action
  }, []);

  const undo = useCallback(
    (getCurrentSnapshot?: () => BoardSnapshot) => {
      const past = pastRef.current;
      if (past.length < 1) return; // need at least one state to restore to
      const previous = past[past.length - 1];
      if (getCurrentSnapshot) {
        futureRef.current = [getCurrentSnapshot(), ...futureRef.current];
      }
      pastRef.current = past.slice(0, -1);
      onRestore(previous);
    },
    [onRestore]
  );

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    const next = future[0];
    pastRef.current = [...pastRef.current, next];
    futureRef.current = future.slice(1);
    onRestore(next);
  }, [onRestore]);

  const canUndo = () => pastRef.current.length >= 1;
  const canRedo = () => futureRef.current.length > 0;

  return { push, undo, redo, canUndo, canRedo };
}
