"use client";

import { useEffect, useRef, useCallback } from "react";
import { ref, set, remove } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";

const THROTTLE_MS = 40; // ~25 updates/sec, within 30-50ms guideline

export function useSyncActiveStroke(
  boardId: string,
  userId: string,
  currentStroke: number[],
  isDrawing: boolean
) {
  const lastWriteRef = useRef<number>(0);
  const pendingRef = useRef<{ points: number[] } | null>(null);
  const rafRef = useRef<number | null>(null);

  const writeToRtdb = useCallback(
    (points: number[]) => {
      const rtdb = getFirebaseDatabase();
      const drawingRef = ref(rtdb, `drawing/${boardId}/${userId}`);
      set(drawingRef, {
        points,
        strokeWidth: 2,
        strokeColor: "#000000",
        updatedAt: Date.now(),
      });
    },
    [boardId, userId]
  );

  const clearRtdb = useCallback(() => {
    const rtdb = getFirebaseDatabase();
    const drawingRef = ref(rtdb, `drawing/${boardId}/${userId}`);
    remove(drawingRef);
  }, [boardId, userId]);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingRef.current;
      if (pending && pending.points.length >= 2) {
        pendingRef.current = null;
        lastWriteRef.current = Date.now();
        writeToRtdb(pending.points);
      }
    });
  }, [writeToRtdb]);

  useEffect(() => {
    if (!isDrawing) {
      clearRtdb();
      return;
    }

    const now = Date.now();
    if (currentStroke.length >= 2) {
      if (now - lastWriteRef.current >= THROTTLE_MS) {
        lastWriteRef.current = now;
        writeToRtdb(currentStroke);
      } else {
        pendingRef.current = { points: currentStroke };
        scheduleFlush();
      }
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [
    isDrawing,
    currentStroke,
    writeToRtdb,
    clearRtdb,
    scheduleFlush,
  ]);

  useEffect(() => {
    const rtdb = getFirebaseDatabase();
    const drawingRef = ref(rtdb, `drawing/${boardId}/${userId}`);
    return () => {
      remove(drawingRef);
    };
  }, [boardId, userId]);
}
