"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import type { RemoteCursor } from "./types";

const CURSOR_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function hashToColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
}

export function useRemoteCursors(boardId: string, excludeUserId?: string) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

  useEffect(() => {
    const db = getFirebaseDatabase();
    const presenceRef = ref(db, `presence/${boardId}`);

    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      const result: RemoteCursor[] = [];

      if (data) {
        for (const [userId, value] of Object.entries(data)) {
          if (excludeUserId && userId === excludeUserId) continue;
          const pos = value as { x: number; y: number; updatedAt: number };
          if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
            result.push({
              userId,
              x: pos.x,
              y: pos.y,
              updatedAt: pos.updatedAt ?? 0,
              color: hashToColor(userId),
            });
          }
        }
      }

      setCursors(result);
    });

    return () => unsubscribe();
  }, [boardId, excludeUserId]);

  return cursors;
}
