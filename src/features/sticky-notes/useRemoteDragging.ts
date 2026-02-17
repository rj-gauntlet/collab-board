"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import type { DraggingState } from "./types";

export interface RemoteDragging extends DraggingState {
  userId: string;
}

export function useRemoteDragging(
  boardId: string,
  excludeUserId?: string
): RemoteDragging[] {
  const [dragging, setDragging] = useState<RemoteDragging[]>([]);

  useEffect(() => {
    const rtdb = getFirebaseDatabase();
    const draggingRef = ref(rtdb, `dragging/${boardId}`);

    const unsubscribe = onValue(draggingRef, (snapshot) => {
      const data = snapshot.val();
      const result: RemoteDragging[] = [];

      if (data && typeof data === "object") {
        for (const [userId, value] of Object.entries(data)) {
          if (excludeUserId && userId === excludeUserId) continue;
          const state = value as DraggingState;
          if (state?.elementId && typeof state.x === "number" && typeof state.y === "number") {
            result.push({
              userId,
              elementId: state.elementId,
              x: state.x,
              y: state.y,
              updatedAt: state.updatedAt ?? 0,
            });
          }
        }
      }

      setDragging(result);
    });

    return () => unsubscribe();
  }, [boardId, excludeUserId]);

  return dragging;
}
