"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ref, onValue } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import type { ActiveStroke } from "./types";

export interface RemoteActiveStroke extends ActiveStroke {
  userId: string;
}

/** Throttle display updates to avoid FPS drop when other tabs are drawing */
const DISPLAY_THROTTLE_MS = 33; // ~30fps

function parseStrokes(
  data: unknown,
  excludeUserId?: string
): RemoteActiveStroke[] {
  const result: RemoteActiveStroke[] = [];
  if (!data || typeof data !== "object") return result;

  for (const [userId, value] of Object.entries(data)) {
    if (excludeUserId && userId === excludeUserId) continue;
    const stroke = value as ActiveStroke;
    if (
      stroke &&
      Array.isArray(stroke.points) &&
      stroke.points.length >= 2
    ) {
      result.push({
        userId,
        points: stroke.points,
        strokeWidth: stroke.strokeWidth ?? 2,
        strokeColor: stroke.strokeColor ?? "#000000",
        updatedAt: stroke.updatedAt ?? 0,
      });
    }
  }
  return result;
}

export function useRemoteActiveStrokes(
  boardId: string,
  excludeUserId?: string
): RemoteActiveStroke[] {
  const [strokes, setStrokes] = useState<RemoteActiveStroke[]>([]);
  const pendingRef = useRef<RemoteActiveStroke[] | null>(null);
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
    setStrokes(pending);
  }, []);

  useEffect(() => {
    const rtdb = getFirebaseDatabase();
    const drawingRef = ref(rtdb, `drawing/${boardId}`);

    const onVisibilityChange = () => {
      if (!document.hidden && pendingRef.current) {
        lastFlushRef.current = 0;
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(flushPending);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const unsubscribe = onValue(drawingRef, (snapshot) => {
      pendingRef.current = parseStrokes(snapshot.val(), excludeUserId);
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

  return strokes;
}
