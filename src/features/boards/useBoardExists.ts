"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Returns whether the board exists (created via Create new board / New board).
 * A board exists if boards/{boardId} exists (new flow) or it's in the user's userBoards (legacy).
 */
export function useBoardExists(
  boardId: string | null,
  userId: string | undefined
): {
  exists: boolean | null;
  loading: boolean;
} {
  const [boardExists, setBoardExists] = useState<boolean>(false);
  const [userBoardExists, setUserBoardExists] = useState<boolean>(false);
  const [boardReady, setBoardReady] = useState(false);
  const [userBoardReady, setUserBoardReady] = useState(false);

  useEffect(() => {
    if (!boardId) {
      setBoardExists(false);
      setUserBoardExists(false);
      setBoardReady(true);
      setUserBoardReady(true);
      return;
    }

    setBoardReady(false);
    setUserBoardReady(!userId);
    const boardRef = doc(db, "boards", boardId);

    const unsubBoard = onSnapshot(
      boardRef,
      (snap) => {
        setBoardExists(snap.exists());
        setBoardReady(true);
      },
      () => {
        setBoardExists(false);
        setBoardReady(true);
      }
    );

    if (!userId) {
      return () => unsubBoard();
    }

    const userBoardRef = doc(db, "userBoards", userId, "boards", boardId);
    const unsubUserBoard = onSnapshot(
      userBoardRef,
      (snap) => {
        setUserBoardExists(snap.exists());
        setUserBoardReady(true);
      },
      () => {
        setUserBoardExists(false);
        setUserBoardReady(true);
      }
    );

    return () => {
      unsubBoard();
      unsubUserBoard();
    };
  }, [boardId, userId]);

  const loading = !boardReady || (!!userId && !userBoardReady);
  const exists = boardExists || userBoardExists;
  return { exists: loading ? null : exists, loading };
}
