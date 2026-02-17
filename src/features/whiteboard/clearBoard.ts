"use client";

import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { ref, remove } from "firebase/database";
import { db, getFirebaseDatabase } from "@/lib/firebase";

const BATCH_SIZE = 500;

export async function clearBoard(boardId: string): Promise<void> {
  const elementsRef = collection(db, "boards", boardId, "elements");
  const snapshot = await getDocs(elementsRef);

  let batch = writeBatch(db);
  let count = 0;

  for (const docSnap of snapshot.docs) {
    batch.delete(doc(elementsRef, docSnap.id));
    count++;
    if (count >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }

  const rtdb = getFirebaseDatabase();
  await Promise.all([
    remove(ref(rtdb, `lines/${boardId}`)),
    remove(ref(rtdb, `notes/${boardId}`)),
    remove(ref(rtdb, `shapes/${boardId}`)),
    remove(ref(rtdb, `drawing/${boardId}`)),
    remove(ref(rtdb, `dragging/${boardId}`)),
  ]);
}
