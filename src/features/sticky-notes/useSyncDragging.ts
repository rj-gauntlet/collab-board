"use client";

import { useEffect, useRef, useCallback } from "react";
import { ref, set, remove } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";

const THROTTLE_MS = 40;

export function useSyncDragging(
  boardId: string,
  userId: string,
  isDragging: boolean,
  elementId: string | null,
  x: number,
  y: number
) {
  const lastWriteRef = useRef<number>(0);
  const pendingRef = useRef<{ elementId: string; x: number; y: number } | null>(
    null
  );
  const rafRef = useRef<number | null>(null);

  const writeToRtdb = useCallback(
    (elementId: string, x: number, y: number) => {
      const rtdb = getFirebaseDatabase();
      const draggingRef = ref(rtdb, `dragging/${boardId}/${userId}`);
      set(draggingRef, {
        elementId,
        x,
        y,
        updatedAt: Date.now(),
      });
    },
    [boardId, userId]
  );

  const clearRtdb = useCallback(() => {
    const rtdb = getFirebaseDatabase();
    const draggingRef = ref(rtdb, `dragging/${boardId}/${userId}`);
    remove(draggingRef);
  }, [boardId, userId]);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingRef.current;
      if (pending) {
        pendingRef.current = null;
        lastWriteRef.current = Date.now();
        writeToRtdb(pending.elementId, pending.x, pending.y);
      }
    });
  }, [writeToRtdb]);

  useEffect(() => {
    if (!isDragging || !elementId) {
      clearRtdb();
      return;
    }

    const now = Date.now();
    if (now - lastWriteRef.current >= THROTTLE_MS) {
      lastWriteRef.current = now;
      writeToRtdb(elementId, x, y);
    } else {
      pendingRef.current = { elementId, x, y };
      scheduleFlush();
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isDragging, elementId, x, y, writeToRtdb, clearRtdb, scheduleFlush]);

  useEffect(() => {
    const rtdb = getFirebaseDatabase();
    const draggingRef = ref(rtdb, `dragging/${boardId}/${userId}`);
    return () => {
      remove(draggingRef);
    };
  }, [boardId, userId]);
}
