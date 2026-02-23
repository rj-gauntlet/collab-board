"use client";

import { useEffect, useRef, useCallback } from "react";
import { ref, set, remove } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";

export interface DraggingElement {
  elementId: string;
  x: number;
  y: number;
}

const THROTTLE_MS = 40;

export function useSyncDragging(
  boardId: string,
  userId: string,
  isDragging: boolean,
  elements: DraggingElement[]
) {
  const lastWriteRef = useRef<number>(0);
  const pendingRef = useRef<DraggingElement[] | null>(null);
  const rafRef = useRef<number | null>(null);

  const writeToRtdb = useCallback(
    (els: DraggingElement[]) => {
      const rtdb = getFirebaseDatabase();
      const draggingRef = ref(rtdb, `dragging/${boardId}/${userId}`);
      if (els.length === 0) {
        remove(draggingRef);
        return;
      }
      set(draggingRef, {
        elements: els.map((e) => ({ elementId: e.elementId, x: e.x, y: e.y })),
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
      if (pending?.length) {
        pendingRef.current = null;
        lastWriteRef.current = Date.now();
        writeToRtdb(pending);
      }
    });
  }, [writeToRtdb]);

  useEffect(() => {
    if (!isDragging || elements.length === 0) {
      clearRtdb();
      return;
    }

    const now = Date.now();
    if (now - lastWriteRef.current >= THROTTLE_MS) {
      lastWriteRef.current = now;
      writeToRtdb(elements);
    } else {
      pendingRef.current = elements;
      scheduleFlush();
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isDragging, elements, writeToRtdb, clearRtdb, scheduleFlush]);

  useEffect(() => {
    const rtdb = getFirebaseDatabase();
    const draggingRef = ref(rtdb, `dragging/${boardId}/${userId}`);
    return () => {
      remove(draggingRef);
    };
  }, [boardId, userId]);
}
