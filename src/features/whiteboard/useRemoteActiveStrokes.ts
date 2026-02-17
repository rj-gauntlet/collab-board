"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import type { ActiveStroke } from "./types";

export interface RemoteActiveStroke extends ActiveStroke {
  userId: string;
}

export function useRemoteActiveStrokes(
  boardId: string,
  excludeUserId?: string
): RemoteActiveStroke[] {
  const [strokes, setStrokes] = useState<RemoteActiveStroke[]>([]);

  useEffect(() => {
    const rtdb = getFirebaseDatabase();
    const drawingRef = ref(rtdb, `drawing/${boardId}`);

    const unsubscribe = onValue(drawingRef, (snapshot) => {
      const data = snapshot.val();
      const result: RemoteActiveStroke[] = [];

      if (data && typeof data === "object") {
        for (const [userId, value] of Object.entries(data)) {
          if (excludeUserId && userId === excludeUserId) continue;
          const stroke = value as ActiveStroke;
          if (
            stroke &&
            Array.isArray(stroke.points) &&
            stroke.points.length >= 2
          ) {
            result.push({
              userId,
              points: stroke.points,
              strokeWidth: stroke.strokeWidth ?? 2,
              strokeColor: stroke.strokeColor ?? "#000000",
              updatedAt: stroke.updatedAt ?? 0,
            });
          }
        }
      }

      setStrokes(result);
    });

    return () => unsubscribe();
  }, [boardId, excludeUserId]);

  return strokes;
}
