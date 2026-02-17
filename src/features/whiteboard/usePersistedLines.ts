"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LineElement, LineElementDoc } from "./types";

export function usePersistedLines(boardId: string) {
  const [lines, setLines] = useState<LineElement[]>([]);

  useEffect(() => {
    const elementsRef = collection(db, "boards", boardId, "elements");
    const q = query(elementsRef, where("type", "==", "line"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: LineElement[] = [];
        snapshot.forEach((docSnap) => {
        const data = docSnap.data() as LineElementDoc & { createdAt?: unknown };
        const raw = data.createdAt;
        const createdAt =
          raw && typeof raw === "object" && "toMillis" in raw
            ? (raw as Timestamp).toMillis()
            : typeof raw === "number"
              ? raw
              : raw && typeof raw === "object" && "getTime" in raw
                ? (raw as Date).getTime()
                : Date.now();

        result.push({
          id: docSnap.id,
          type: "line",
          points: data.points ?? [],
          strokeWidth: data.strokeWidth ?? 2,
          strokeColor: data.strokeColor ?? "#000000",
          createdBy: data.createdBy ?? "",
          createdAt,
        });
      });
        result.sort((a, b) => a.createdAt - b.createdAt);
        setLines(result);
      },
      (err) => {
        console.error("Firestore lines subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [boardId]);

  return lines;
}

export async function persistLine(
  boardId: string,
  line: LineElement
): Promise<void> {
  const elementsRef = collection(db, "boards", boardId, "elements");
  await setDoc(doc(elementsRef, line.id), {
    type: "line",
    points: line.points,
    strokeWidth: line.strokeWidth,
    strokeColor: line.strokeColor,
    createdBy: line.createdBy,
    createdAt: line.createdAt,
  });
}
