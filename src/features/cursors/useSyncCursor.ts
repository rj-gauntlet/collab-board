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
    (
      position: Partial<CursorPosition> & {
        updatedAt: number;
        scale?: number;
        centerBoardX?: number;
        centerBoardY?: number;
      }
    ) => {
      const db = getFirebaseDatabase();
      const presenceRef = ref(db, `presence/${boardId}/${userId}`);
      const payload: Record<string, unknown> = {
        ...position,
        updatedAt: position.updatedAt,
        displayName: displayName ?? position.displayName ?? null,
      };
      if (position.scale !== undefined) payload.scale = position.scale;
      if (position.centerBoardX !== undefined) payload.centerBoardX = position.centerBoardX;
      if (position.centerBoardY !== undefined) payload.centerBoardY = position.centerBoardY;
      if (position.x !== undefined) payload.x = position.x;
      if (position.y !== undefined) payload.y = position.y;
      set(presenceRef, payload);
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
    (
      x: number,
      y: number,
      viewport?: { scale: number; centerBoardX: number; centerBoardY: number }
    ) => {
      const now = Date.now();
      const throttle =
        typeof document !== "undefined" && document.hidden
          ? THROTTLE_MS_HIDDEN
          : THROTTLE_MS;
      const position: CursorPosition & {
        scale?: number;
        centerBoardX?: number;
        centerBoardY?: number;
      } = { x, y, updatedAt: now };
      if (viewport) {
        position.scale = viewport.scale;
        position.centerBoardX = viewport.centerBoardX;
        position.centerBoardY = viewport.centerBoardY;
      }

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

  /** Call when pointer leaves the canvas so others stop seeing your cursor. Keeps viewport for "Go to view". */
  const syncCursorOutOfViewport = useCallback(
    (viewport?: { scale: number; centerBoardX: number; centerBoardY: number }) => {
      const now = Date.now();
      const payload: Record<string, unknown> = {
        updatedAt: now,
        displayName: displayName ?? null,
      };
      if (viewport) {
        payload.scale = viewport.scale;
        payload.centerBoardX = viewport.centerBoardX;
        payload.centerBoardY = viewport.centerBoardY;
      }
      const db = getFirebaseDatabase();
      const presenceRef = ref(db, `presence/${boardId}/${userId}`);
      set(presenceRef, payload);
    },
    [boardId, userId, displayName]
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

  return { syncCursor, syncCursorOutOfViewport };
}
