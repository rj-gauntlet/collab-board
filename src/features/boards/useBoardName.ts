"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Subscribes to the board's name in Firestore. Returns the name if set, otherwise null (caller should fall back to boardId).
 */
export function useBoardName(boardId: string | null): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId) {
      setName(null);
      return;
    }

    const boardRef = doc(db, "boards", boardId);
    const unsubscribe = onSnapshot(
      boardRef,
      (snap) => {
        const n = snap.data()?.name;
        setName(typeof n === "string" && n.length > 0 ? n : null);
      },
      () => setName(null)
    );

    return () => unsubscribe();
  }, [boardId]);

  return name;
}
