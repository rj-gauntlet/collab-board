"use client";

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
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
 */
export async function addUserBoard(
  userId: string,
  boardId: string
): Promise<void> {
  const boardRef = doc(db, USER_BOARDS_PATH, userId, "boards", boardId);
  await setDoc(boardRef, {
    boardId,
    name: "",
    createdAt: Timestamp.now(),
  });
}

/**
 * Updates a board's display name. Writes to both userBoards (for the list) and boards (for the board header).
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
 * Removes the board from the user's list and clears all board content.
 */
export async function deleteUserBoard(
  userId: string,
  boardId: string
): Promise<void> {
  await Promise.all([
    removeUserBoard(userId, boardId),
    clearBoard(boardId),
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
