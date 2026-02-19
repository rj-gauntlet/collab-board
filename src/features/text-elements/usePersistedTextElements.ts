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
import { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TextElement, TextElementDoc } from "./types";

const DEFAULT_WIDTH = 200;
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_FONT_FAMILY = "sans-serif";
const DEFAULT_FILL = "#1f2937";

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

export function usePersistedTextElements(boardId: string) {
  const [textElements, setTextElements] = useState<TextElement[]>([]);

  useEffect(() => {
    const elementsRef = collection(db, "boards", boardId, "elements");
    const q = query(elementsRef, where("type", "==", "text"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: TextElement[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as TextElementDoc & {
            createdAt?: unknown;
            updatedAt?: unknown;
          };
          result.push({
            id: docSnap.id,
            type: "text",
            text: data.text ?? "",
            x: data.x ?? 0,
            y: data.y ?? 0,
            width: data.width ?? DEFAULT_WIDTH,
            fontSize: data.fontSize ?? DEFAULT_FONT_SIZE,
            fontFamily: data.fontFamily ?? DEFAULT_FONT_FAMILY,
            fill: data.fill ?? DEFAULT_FILL,
            bold: data.bold ?? false,
            italic: data.italic ?? false,
            createdBy: data.createdBy ?? "",
            createdAt: parseTimestamp(data.createdAt),
            updatedAt: parseTimestamp(data.updatedAt),
          });
        });
        result.sort((a, b) => a.createdAt - b.createdAt);
        setTextElements(result);
      },
      (err) => {
        console.error("Firestore text elements subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [boardId]);

  return textElements;
}

export async function deleteTextElement(
  boardId: string,
  textId: string
): Promise<void> {
  const elementsRef = collection(db, "boards", boardId, "elements");
  await deleteDoc(doc(elementsRef, textId));
}

export async function persistTextElement(
  boardId: string,
  text: TextElement
): Promise<void> {
  const elementsRef = collection(db, "boards", boardId, "elements");
  await setDoc(doc(elementsRef, text.id), {
    type: "text",
    text: text.text,
    x: text.x,
    y: text.y,
    width: text.width,
    fontSize: text.fontSize,
    fontFamily: text.fontFamily,
    fill: text.fill,
    bold: text.bold ?? false,
    italic: text.italic ?? false,
    createdBy: text.createdBy,
    createdAt: text.createdAt,
    updatedAt: text.updatedAt,
  });
}

export function createDefaultTextElement(
  x: number,
  y: number,
  userId: string
): TextElement {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `text-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  return {
    id,
    type: "text",
    text: "",
    x,
    y,
    width: DEFAULT_WIDTH,
    fontSize: DEFAULT_FONT_SIZE,
    fontFamily: DEFAULT_FONT_FAMILY,
    fill: DEFAULT_FILL,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
}
