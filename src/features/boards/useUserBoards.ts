"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserBoard } from "./userBoardActions";

export function useUserBoards(userId: string | undefined) {
  const [boards, setBoards] = useState<UserBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setBoards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const boardsRef = collection(db, "userBoards", userId, "boards");
    const q = query(boardsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: UserBoard[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            boardId: data?.boardId ?? d.id,
            name: data?.name ?? "",
            createdAt: data?.createdAt?.toDate?.() ?? new Date(0),
          };
        });
        setBoards(items);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { boards, loading, error };
}
