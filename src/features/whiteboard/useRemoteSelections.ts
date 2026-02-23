"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";

const STALE_MS = 15_000;

export interface RemoteSelection {
  userId: string;
  selectedIds: string[];
  updatedAt: number;
}

export function useRemoteSelections(
  boardId: string,
  excludeUserId?: string
): RemoteSelection[] {
  const [selections, setSelections] = useState<RemoteSelection[]>([]);

  useEffect(() => {
    if (!boardId) return;

    const db = getFirebaseDatabase();
    const selectionRef = ref(db, `selection/${boardId}`);

    const unsubscribe = onValue(selectionRef, (snapshot) => {
      const data = snapshot.val();
      const result: RemoteSelection[] = [];
      const now = Date.now();

      if (data && typeof data === "object") {
        for (const [uid, value] of Object.entries(data)) {
          if (excludeUserId && uid === excludeUserId) continue;
          const v = value as { selectedIds?: string[]; updatedAt?: number };
          if (!v || !Array.isArray(v.selectedIds)) continue;
          if (now - (v.updatedAt ?? 0) > STALE_MS) continue;
          result.push({
            userId: uid,
            selectedIds: v.selectedIds,
            updatedAt: v.updatedAt ?? 0,
          });
        }
      }
      setSelections(result);
    });

    return () => unsubscribe();
  }, [boardId, excludeUserId]);

  return selections;
}
