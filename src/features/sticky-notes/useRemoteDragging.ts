"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ref, onValue } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import type { DraggingState } from "./types";

export interface RemoteDragging extends DraggingState {
  userId: string;
}

/** Throttle display updates to avoid FPS drop when other tabs are dragging */
const DISPLAY_THROTTLE_MS = 33; // ~30fps

function parseDragging(
  data: unknown,
  excludeUserId?: string
): RemoteDragging[] {
  const result: RemoteDragging[] = [];
  if (!data || typeof data !== "object") return result;

  for (const [userId, value] of Object.entries(data)) {
    if (excludeUserId && userId === excludeUserId) continue;
    const state = value as DraggingState;
    if (state?.elementId && typeof state.x === "number" && typeof state.y === "number") {
      result.push({
        userId,
        elementId: state.elementId,
        x: state.x,
        y: state.y,
        updatedAt: state.updatedAt ?? 0,
      });
    }
  }
  return result;
}

export function useRemoteDragging(
  boardId: string,
  excludeUserId?: string
): RemoteDragging[] {
  const [dragging, setDragging] = useState<RemoteDragging[]>([]);
  const pendingRef = useRef<RemoteDragging[] | null>(null);
  const lastFlushRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const flushPending = useCallback(() => {
    rafRef.current = null;
    if (typeof document !== "undefined" && document.hidden) return;
    const pending = pendingRef.current;
    if (!pending) return;

    const now = performance.now();
    if (now - lastFlushRef.current < DISPLAY_THROTTLE_MS) {
      rafRef.current = requestAnimationFrame(flushPending);
      return;
    }
    lastFlushRef.current = now;
    pendingRef.current = null;
    setDragging(pending);
  }, []);

  useEffect(() => {
    const rtdb = getFirebaseDatabase();
    const draggingRef = ref(rtdb, `dragging/${boardId}`);

    const onVisibilityChange = () => {
      if (!document.hidden && pendingRef.current) {
        lastFlushRef.current = 0;
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(flushPending);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const unsubscribe = onValue(draggingRef, (snapshot) => {
      pendingRef.current = parseDragging(snapshot.val(), excludeUserId);
      if (typeof document !== "undefined" && document.hidden) return;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushPending);
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribe();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [boardId, excludeUserId, flushPending]);

  return dragging;
}
