"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import type { ShapeElement, ShapeKind } from "./types";

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 80;
const DEFAULT_FILL = "#e0e7ff";
const DEFAULT_STROKE = "#6366f1";
const DEFAULT_STROKE_WIDTH = 2;

export function useRemoteShapes(boardId: string): ShapeElement[] {
  const [shapes, setShapes] = useState<ShapeElement[]>([]);

  useEffect(() => {
    const rtdb = getFirebaseDatabase();
    const shapesRef = ref(rtdb, `shapes/${boardId}`);

    const unsubscribe = onValue(shapesRef, (snapshot) => {
      const data = snapshot.val();
      const result: ShapeElement[] = [];

      if (data && typeof data === "object") {
        for (const [shapeId, value] of Object.entries(data)) {
          const shape = value as {
            kind?: ShapeKind;
            x?: number;
            y?: number;
            width?: number;
            height?: number;
            rotation?: number;
            fill?: string;
            stroke?: string;
            strokeWidth?: number;
            createdBy?: string;
            createdAt?: number;
            updatedAt?: number;
          };
          if (
            shape &&
            typeof shape.x === "number" &&
            typeof shape.y === "number"
          ) {
            result.push({
              id: shapeId,
              type: "shape",
              kind: shape.kind ?? "rect",
              x: shape.x ?? 0,
              y: shape.y ?? 0,
              width: shape.width ?? DEFAULT_WIDTH,
              height: shape.height ?? DEFAULT_HEIGHT,
              rotation: shape.rotation ?? 0,
              fill: shape.fill ?? DEFAULT_FILL,
              stroke: shape.stroke ?? DEFAULT_STROKE,
              strokeWidth: shape.strokeWidth ?? DEFAULT_STROKE_WIDTH,
              createdBy: shape.createdBy ?? "",
              createdAt: shape.createdAt ?? Date.now(),
              updatedAt: shape.updatedAt ?? Date.now(),
            });
          }
        }
      }

      result.sort((a, b) => a.createdAt - b.createdAt);
      setShapes(result);
    });

    return () => unsubscribe();
  }, [boardId]);

  return shapes;
}

export function writeShapeToRtdb(
  boardId: string,
  shape: ShapeElement
): void {
  const rtdb = getFirebaseDatabase();
  const shapeRef = ref(rtdb, `shapes/${boardId}/${shape.id}`);
  set(shapeRef, {
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
