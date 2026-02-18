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
import { writeShapeToRtdb } from "./useRemoteShapes";
import type { ShapeElement, ShapeDoc } from "./types";

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 80;
const DEFAULT_FILL = "#e0e7ff";
const DEFAULT_STROKE = "#6366f1";
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

export function usePersistedShapes(boardId: string) {
  const [shapes, setShapes] = useState<ShapeElement[]>([]);

  useEffect(() => {
    const elementsRef = collection(db, "boards", boardId, "elements");
    const q = query(elementsRef, where("type", "==", "shape"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: ShapeElement[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ShapeDoc & {
            createdAt?: unknown;
            updatedAt?: unknown;
          };
          result.push({
            id: docSnap.id,
            type: "shape",
            kind: data.kind ?? "rect",
            x: data.x ?? 0,
            y: data.y ?? 0,
            width: data.width ?? DEFAULT_WIDTH,
            height: data.height ?? DEFAULT_HEIGHT,
            rotation: data.rotation ?? 0,
            fill: data.fill ?? DEFAULT_FILL,
            stroke: data.stroke ?? DEFAULT_STROKE,
            strokeWidth: data.strokeWidth ?? DEFAULT_STROKE_WIDTH,
            createdBy: data.createdBy ?? "",
            createdAt: parseTimestamp(data.createdAt),
            updatedAt: parseTimestamp(data.updatedAt),
          });
        });
        result.sort((a, b) => a.createdAt - b.createdAt);
        setShapes(result);
      },
      (err) => {
        console.error("Firestore shapes subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [boardId]);

  return shapes;
}

export async function deleteShape(
  boardId: string,
  shapeId: string
): Promise<void> {
  const elementsRef = collection(db, "boards", boardId, "elements");
  await deleteDoc(doc(elementsRef, shapeId));
  const rtdb = getFirebaseDatabase();
  await remove(ref(rtdb, `shapes/${boardId}/${shapeId}`));
}

export async function persistShape(
  boardId: string,
  shape: ShapeElement
): Promise<void> {
  writeShapeToRtdb(boardId, shape);
  const elementsRef = collection(db, "boards", boardId, "elements");
  await setDoc(doc(elementsRef, shape.id), {
    type: "shape",
    kind: shape.kind,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    rotation: shape.rotation,
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    createdBy: shape.createdBy,
    createdAt: shape.createdAt,
    updatedAt: shape.updatedAt,
  });
}

export function createDefaultShape(
  x: number,
  y: number,
  userId: string,
  kind: import("./types").ShapeKind = "rect"
): ShapeElement {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `shape-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  return {
    id,
    type: "shape",
    kind,
    x,
    y,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    rotation: 0,
    fill: DEFAULT_FILL,
    stroke: DEFAULT_STROKE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
}
