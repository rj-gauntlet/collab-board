"use client";

import { useEffect, useRef, useCallback } from "react";
import { ref, set, remove, onDisconnect } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import type { CursorPosition } from "./types";

const THROTTLE_MS = 40; // ~25 updates/sec when tab visible
const THROTTLE_MS_HIDDEN = 500; // ~2 updates/sec when tab in background

export function useSyncCursor(
  boardId: string,
  userId: string,
  displayName?: string | null
) {
  const lastUpdateRef = useRef<number>(0);
  const pendingPositionRef = useRef<CursorPosition | null>(null);
  const rafRef = useRef<number | null>(null);

  const flushPosition = useCallback(
    (position: CursorPosition) => {
      const db = getFirebaseDatabase();
      const presenceRef = ref(db, `presence/${boardId}/${userId}`);
      set(presenceRef, {
        ...position,
        updatedAt: Date.now(),
        displayName: displayName ?? position.displayName ?? null,
      });
    },
    [boardId, userId, displayName]
  );

  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingPositionRef.current;
      if (pending) {
        pendingPositionRef.current = null;
        flushPosition(pending);
      }
    });
  }, [flushPosition]);

  const syncCursor = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      const throttle =
        typeof document !== "undefined" && document.hidden
          ? THROTTLE_MS_HIDDEN
          : THROTTLE_MS;
      const position: CursorPosition = { x, y, updatedAt: now };

      if (now - lastUpdateRef.current >= throttle) {
        lastUpdateRef.current = now;
        flushPosition(position);
      } else {
        pendingPositionRef.current = position;
        scheduleFlush();
      }
    },
    [flushPosition, scheduleFlush]
  );

  useEffect(() => {
    const db = getFirebaseDatabase();
    const presenceRef = ref(db, `presence/${boardId}/${userId}`);
    onDisconnect(presenceRef).remove();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      remove(presenceRef);
    };
  }, [boardId, userId]);

  return { syncCursor };
}
