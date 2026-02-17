"use client";

import { useEffect, useState } from "react";
import { ref, set, onValue } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import type { LineElement } from "./types";

export function useRemoteCompletedLines(boardId: string): LineElement[] {
  const [lines, setLines] = useState<LineElement[]>([]);

  useEffect(() => {
    const rtdb = getFirebaseDatabase();
    const linesRef = ref(rtdb, `lines/${boardId}`);

    const unsubscribe = onValue(linesRef, (snapshot) => {
      const data = snapshot.val();
      const result: LineElement[] = [];

      if (data && typeof data === "object") {
        for (const [lineId, value] of Object.entries(data)) {
          const line = value as {
            points?: number[];
            strokeWidth?: number;
            strokeColor?: string;
            createdBy?: string;
            createdAt?: number;
          };
          if (line && Array.isArray(line.points) && line.points.length >= 2) {
            result.push({
              id: lineId,
              type: "line",
              points: line.points,
              strokeWidth: line.strokeWidth ?? 2,
              strokeColor: line.strokeColor ?? "#000000",
              createdBy: line.createdBy ?? "",
              createdAt: line.createdAt ?? Date.now(),
            });
          }
        }
      }

      result.sort((a, b) => a.createdAt - b.createdAt);
      setLines(result);
    });

    return () => unsubscribe();
  }, [boardId]);

  return lines;
}

export function writeCompletedLineToRtdb(
  boardId: string,
  line: LineElement
): void {
  const rtdb = getFirebaseDatabase();
  const lineRef = ref(rtdb, `lines/${boardId}/${line.id}`);
  set(lineRef, {
    points: line.points,
    strokeWidth: line.strokeWidth,
    strokeColor: line.strokeColor,
    createdBy: line.createdBy,
    createdAt: line.createdAt,
  });
}
