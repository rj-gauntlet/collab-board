"use client";

import { useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useRegisterBoardUser(
  boardId: string,
  userId: string | undefined,
  displayName: string | null | undefined,
  email: string | null | undefined
) {
  useEffect(() => {
    if (!boardId || !userId) return;

    const userRef = doc(db, "boardUsers", boardId, "users", userId);
    setDoc(
      userRef,
      {
        displayName: displayName ?? "Anonymous",
        email: email ?? null,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      },
      { merge: true }
    ).catch((err) => console.error("Failed to register board user:", err));
  }, [boardId, userId, displayName, email]);
}
