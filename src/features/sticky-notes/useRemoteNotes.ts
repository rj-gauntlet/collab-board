"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import type { StickyNoteElement } from "./types";

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 120;
const DEFAULT_COLOR = "#fef08a";

export function useRemoteNotes(boardId: string): StickyNoteElement[] {
  const [notes, setNotes] = useState<StickyNoteElement[]>([]);

  useEffect(() => {
    const rtdb = getFirebaseDatabase();
    const notesRef = ref(rtdb, `notes/${boardId}`);

    const unsubscribe = onValue(notesRef, (snapshot) => {
      const data = snapshot.val();
      const result: StickyNoteElement[] = [];

      if (data && typeof data === "object") {
        for (const [noteId, value] of Object.entries(data)) {
          const note = value as {
            text?: string;
            color?: string;
            x?: number;
            y?: number;
            width?: number;
            height?: number;
            createdBy?: string;
            createdAt?: number;
            updatedAt?: number;
          };
          if (note && typeof note.x === "number" && typeof note.y === "number") {
            result.push({
              id: noteId,
              type: "sticky-note",
              text: note.text ?? "",
              color: note.color ?? DEFAULT_COLOR,
              x: note.x ?? 0,
              y: note.y ?? 0,
              width: note.width ?? DEFAULT_WIDTH,
              height: note.height ?? DEFAULT_HEIGHT,
              createdBy: note.createdBy ?? "",
              createdAt: note.createdAt ?? Date.now(),
              updatedAt: note.updatedAt ?? Date.now(),
            });
          }
        }
      }

      result.sort((a, b) => a.createdAt - b.createdAt);
      setNotes(result);
    });

    return () => unsubscribe();
  }, [boardId]);

  return notes;
}

export function writeNoteToRtdb(
  boardId: string,
  note: StickyNoteElement
): void {
  const rtdb = getFirebaseDatabase();
  const noteRef = ref(rtdb, `notes/${boardId}/${note.id}`);
  set(noteRef, {
    text: note.text,
    color: note.color,
    x: note.x,
    y: note.y,
    width: note.width,
    height: note.height,
    createdBy: note.createdBy,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  });
}
