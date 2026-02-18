"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, remove } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { writeNoteToRtdb } from "./useRemoteNotes";
import type { StickyNoteElement, StickyNoteDoc } from "./types";

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 120;
const DEFAULT_COLOR = "#fef08a";

function parseTimestamp(raw: unknown): number {
  if (raw && typeof raw === "object" && "toMillis" in raw) {
    return (raw as Timestamp).toMillis();
  }
  if (typeof raw === "number") return raw;
  if (raw && typeof raw === "object" && "getTime" in raw) {
    return (raw as Date).getTime();
  }
  return Date.now();
}

export function usePersistedNotes(boardId: string) {
  const [notes, setNotes] = useState<StickyNoteElement[]>([]);

  useEffect(() => {
    const elementsRef = collection(db, "boards", boardId, "elements");
    const q = query(elementsRef, where("type", "==", "sticky-note"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: StickyNoteElement[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as StickyNoteDoc & {
            createdAt?: unknown;
            updatedAt?: unknown;
          };
          result.push({
            id: docSnap.id,
            type: "sticky-note",
            text: data.text ?? "",
            color: data.color ?? DEFAULT_COLOR,
            x: data.x ?? 0,
            y: data.y ?? 0,
            width: data.width ?? DEFAULT_WIDTH,
            height: data.height ?? DEFAULT_HEIGHT,
            createdBy: data.createdBy ?? "",
            createdAt: parseTimestamp(data.createdAt),
            updatedAt: parseTimestamp(data.updatedAt),
          });
        });
        result.sort((a, b) => a.createdAt - b.createdAt);
        setNotes(result);
      },
      (err) => {
        console.error("Firestore notes subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [boardId]);

  return notes;
}

export async function deleteNote(
  boardId: string,
  noteId: string
): Promise<void> {
  const elementsRef = collection(db, "boards", boardId, "elements");
  await deleteDoc(doc(elementsRef, noteId));
  const rtdb = getFirebaseDatabase();
  await remove(ref(rtdb, `notes/${boardId}/${noteId}`));
}

export async function persistNote(
  boardId: string,
  note: StickyNoteElement
): Promise<void> {
  writeNoteToRtdb(boardId, note);
  const elementsRef = collection(db, "boards", boardId, "elements");
  await setDoc(doc(elementsRef, note.id), {
    type: "sticky-note",
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

export function createDefaultNote(
  x: number,
  y: number,
  userId: string
): StickyNoteElement {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  return {
    id,
    type: "sticky-note",
    text: "",
    color: DEFAULT_COLOR,
    x,
    y,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
}
