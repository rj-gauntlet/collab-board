"use client";

import { useEffect, useRef } from "react";
import { ref, set, remove, onDisconnect } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";

const THROTTLE_MS = 200;

export function useSyncSelection(
  boardId: string,
  userId: string,
  selectedIds: Set<string>
) {
  const lastWriteRef = useRef<number>(0);
  const selectedIdsRef = useRef<Set<string>>(selectedIds);
  selectedIdsRef.current = selectedIds;

  useEffect(() => {
    if (!boardId || !userId) return;

    const db = getFirebaseDatabase();
    const selectionRef = ref(db, `selection/${boardId}/${userId}`);
    const ids = Array.from(selectedIds).sort();
    const now = Date.now();

    if (now - lastWriteRef.current >= THROTTLE_MS) {
      lastWriteRef.current = now;
      set(selectionRef, { selectedIds: ids, updatedAt: now });
    } else {
      const t = setTimeout(() => {
        lastWriteRef.current = Date.now();
        set(selectionRef, {
          selectedIds: Array.from(selectedIdsRef.current).sort(),
          updatedAt: Date.now(),
        });
      }, THROTTLE_MS);
      return () => clearTimeout(t);
    }
  }, [boardId, userId, Array.from(selectedIds).sort().join(",")]);

  useEffect(() => {
    if (!boardId || !userId) return;
    const db = getFirebaseDatabase();
    const selectionRef = ref(db, `selection/${boardId}/${userId}`);
    onDisconnect(selectionRef).remove();
    return () => {
      remove(selectionRef);
    };
  }, [boardId, userId]);
}
