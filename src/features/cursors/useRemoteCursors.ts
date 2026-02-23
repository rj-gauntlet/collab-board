"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ref, onValue } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import { userIdToColor } from "./userColor";
import type { RemoteCursor } from "./types";

/** Max display update rate for remote cursors (avoids FPS drop in other tabs) */
const DISPLAY_THROTTLE_MS = 33; // ~30fps

/** Cursors not updated in this long are considered disconnected and hidden */
const STALE_CURSOR_MS = 10_000;

function isCursorStale(updatedAt: number): boolean {
  return Date.now() - updatedAt > STALE_CURSOR_MS;
}

function parseCursors(
  data: unknown,
  excludeUserId?: string
): RemoteCursor[] {
  const result: RemoteCursor[] = [];
  if (!data || typeof data !== "object") return result;
  const now = Date.now();

  for (const [userId, value] of Object.entries(data)) {
    if (excludeUserId && userId === excludeUserId) continue;
    const pos = value as {
      x: number;
      y: number;
      updatedAt: number;
      displayName?: string;
    };
    if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
      const updatedAt = pos.updatedAt ?? 0;
      if (now - updatedAt > STALE_CURSOR_MS) continue;
      result.push({
        userId,
        x: pos.x,
        y: pos.y,
        updatedAt,
        displayName: pos.displayName,
        color: userIdToColor(userId),
      });
    }
  }
  return result;
}

export function useRemoteCursors(boardId: string, excludeUserId?: string) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const pendingRef = useRef<RemoteCursor[] | null>(null);
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
    setCursors(pending);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursors((prev) => {
        const filtered = prev.filter((c) => !isCursorStale(c.updatedAt));
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 2000);

    const db = getFirebaseDatabase();
    const presenceRef = ref(db, `presence/${boardId}`);

    const onVisibilityChange = () => {
      if (!document.hidden && pendingRef.current) {
        lastFlushRef.current = 0;
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(flushPending);
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const unsubscribe = onValue(presenceRef, (snapshot) => {
      pendingRef.current = parseCursors(snapshot.val(), excludeUserId);
      if (document.hidden) return;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushPending);
      }
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribe();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [boardId, excludeUserId, flushPending]);

  return cursors;
}
