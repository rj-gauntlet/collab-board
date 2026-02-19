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
import type { FrameElement, FrameDoc } from "./types";

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 200;
const DEFAULT_FILL = "rgba(255, 243, 224, 0.6)";
const DEFAULT_STROKE = "#ff8f00";
const DEFAULT_STROKE_WIDTH = 2;

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

export function usePersistedFrames(boardId: string) {
  const [frames, setFrames] = useState<FrameElement[]>([]);

  useEffect(() => {
    const elementsRef = collection(db, "boards", boardId, "elements");
    const q = query(elementsRef, where("type", "==", "frame"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: FrameElement[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as FrameDoc & {
            createdAt?: unknown;
            updatedAt?: unknown;
          };
          result.push({
            id: docSnap.id,
            type: "frame",
            x: data.x ?? 0,
            y: data.y ?? 0,
            width: data.width ?? DEFAULT_WIDTH,
            height: data.height ?? DEFAULT_HEIGHT,
            title: data.title ?? "",
            fill: data.fill ?? DEFAULT_FILL,
            stroke: data.stroke ?? DEFAULT_STROKE,
            strokeWidth: data.strokeWidth ?? DEFAULT_STROKE_WIDTH,
            createdBy: data.createdBy ?? "",
            createdAt: parseTimestamp(data.createdAt),
            updatedAt: parseTimestamp(data.updatedAt),
          });
        });
        result.sort((a, b) => a.createdAt - b.createdAt);
        setFrames(result);
      },
      (err) => {
        console.error("Firestore frames subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [boardId]);

  return frames;
}

export async function deleteFrame(
  boardId: string,
  frameId: string
): Promise<void> {
  const elementsRef = collection(db, "boards", boardId, "elements");
  await deleteDoc(doc(elementsRef, frameId));
}

export async function persistFrame(
  boardId: string,
  frame: FrameElement
): Promise<void> {
  const elementsRef = collection(db, "boards", boardId, "elements");
  await setDoc(doc(elementsRef, frame.id), {
    type: "frame",
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    title: frame.title,
    fill: frame.fill,
    stroke: frame.stroke,
    strokeWidth: frame.strokeWidth,
    createdBy: frame.createdBy,
    createdAt: frame.createdAt,
    updatedAt: frame.updatedAt,
  });
}

export function createDefaultFrame(
  x: number,
  y: number,
  userId: string
): FrameElement {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "frame-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  const now = Date.now();
  return {
    id,
    type: "frame",
    x,
    y,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    title: "Frame",
    fill: DEFAULT_FILL,
    stroke: DEFAULT_STROKE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
}
