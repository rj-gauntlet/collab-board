"use client";

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { clearBoard } from "@/features/whiteboard/clearBoard";

const USER_BOARDS_PATH = "userBoards";
const BOARDS_PATH = "boards";

/**
 * Adds a board to the user's list of created boards.
 * Also creates the board document so the board is considered "existing" (required for viewing).
 */
export async function addUserBoard(
  userId: string,
  boardId: string
): Promise<void> {
  const userBoardRef = doc(db, USER_BOARDS_PATH, userId, "boards", boardId);
  const boardRef = doc(db, BOARDS_PATH, boardId);
  await Promise.all([
    setDoc(userBoardRef, {
      boardId,
      name: "",
      createdAt: Timestamp.now(),
    }),
    setDoc(
      boardRef,
      { name: "", createdAt: Timestamp.now(), createdBy: userId },
      { merge: true }
    ),
  ]);
}

/**
 * Sets the board's display name from the board page. Updates boards/{boardId}
 * and the current user's userBoards entry (so "Your boards" reflects the new name).
 * Also updates the creator's entry if we have createdBy and it's different.
 */
export async function setBoardName(
  boardId: string,
  name: string,
  userId?: string
): Promise<void> {
  const trimmed = name.trim();
  const boardRef = doc(db, BOARDS_PATH, boardId);
  await setDoc(boardRef, { name: trimmed }, { merge: true });

  const updates: Promise<void>[] = [];

  if (userId) {
    const currentUserBoardRef = doc(db, USER_BOARDS_PATH, userId, "boards", boardId);
    const currentSnap = await getDoc(currentUserBoardRef);
    if (currentSnap.exists()) {
      updates.push(updateDoc(currentUserBoardRef, { name: trimmed }));
    }
  }

  const boardSnap = await getDoc(boardRef);
  const createdBy = boardSnap.exists() ? (boardSnap.data()?.createdBy as string | undefined) : undefined;
  if (createdBy && createdBy !== userId) {
    const creatorBoardRef = doc(db, USER_BOARDS_PATH, createdBy, "boards", boardId);
    const creatorSnap = await getDoc(creatorBoardRef);
    if (creatorSnap.exists()) {
      updates.push(updateDoc(creatorBoardRef, { name: trimmed }));
    }
  }

  await Promise.all(updates);
}

/**
 * Updates a board's display name from the list. Writes to both userBoards (for the list) and boards (for the board header).
 */
export async function updateBoardName(
  userId: string,
  boardId: string,
  name: string
): Promise<void> {
  const trimmed = name.trim();
  const userBoardRef = doc(db, USER_BOARDS_PATH, userId, "boards", boardId);
  const boardRef = doc(db, BOARDS_PATH, boardId);
  await Promise.all([
    updateDoc(userBoardRef, { name: trimmed }),
    setDoc(boardRef, { name: trimmed }, { merge: true }),
  ]);
}

/**
 * Removes a board from the user's list (does not delete board content).
 */
export async function removeUserBoard(
  userId: string,
  boardId: string
): Promise<void> {
  const boardRef = doc(db, USER_BOARDS_PATH, userId, "boards", boardId);
  await deleteDoc(boardRef);
}

/**
 * Removes the board from the user's list, clears all board content, and deletes the board document.
 * After deletion, links to the board will show "Board not found".
 */
export async function deleteUserBoard(
  userId: string,
  boardId: string
): Promise<void> {
  const boardRef = doc(db, BOARDS_PATH, boardId);
  await Promise.all([
    removeUserBoard(userId, boardId),
    clearBoard(boardId),
    deleteDoc(boardRef),
  ]);
}

export type UserBoard = {
  id: string;
  boardId: string;
  name: string;
  createdAt: Date;
};

/**
 * Fetches the user's boards (one-time read). Prefer useUserBoards for real-time.
 */
export async function getUserBoards(userId: string): Promise<UserBoard[]> {
  const boardsRef = collection(db, USER_BOARDS_PATH, userId, "boards");
  const q = query(boardsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      boardId: data.boardId ?? d.id,
      name: data.name ?? "",
      createdAt: data.createdAt?.toDate?.() ?? new Date(0),
    };
  });
}
