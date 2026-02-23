"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export interface BoardBackgroundImage {
  url: string;
  width: number;
  height: number;
}

/**
 * Subscribes to the board's background image (imported image) in Firestore.
 */
export function useBoardBackgroundImage(
  boardId: string | null
): BoardBackgroundImage | null {
  const [bg, setBg] = useState<BoardBackgroundImage | null>(null);

  useEffect(() => {
    if (!boardId) {
      setBg(null);
      return;
    }

    const boardRef = doc(db, "boards", boardId);
    const unsubscribe = onSnapshot(
      boardRef,
      (snap) => {
        const data = snap.data();
        const url = data?.backgroundImageUrl;
        const w = data?.backgroundImageWidth;
        const h = data?.backgroundImageHeight;
        if (
          typeof url === "string" &&
          typeof w === "number" &&
          typeof h === "number"
        ) {
          setBg({ url, width: w, height: h });
        } else {
          setBg(null);
        }
      },
      () => setBg(null)
    );

    return () => unsubscribe();
  }, [boardId]);

  return bg;
}

/**
 * Uploads an image file as the board's background (import image).
 * Stores the file in Firebase Storage and saves the URL + dimensions in Firestore.
 */
export async function uploadBoardBackgroundImage(
  boardId: string,
  file: File
): Promise<void> {
  const storageRef = ref(storage, `boards/${boardId}/background`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = url;
    }
  );

  const boardRef = doc(db, "boards", boardId);
  await setDoc(
    boardRef,
    {
      backgroundImageUrl: url,
      backgroundImageWidth: dimensions.width,
      backgroundImageHeight: dimensions.height,
    },
    { merge: true }
  );
}
