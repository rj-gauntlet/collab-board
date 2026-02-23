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

export interface UserViewport {
  scale: number;
  centerBoardX: number;
  centerBoardY: number;
  updatedAt: number;
}

function isCursorStale(updatedAt: number): boolean {
  return Date.now() - updatedAt > STALE_CURSOR_MS;
}

function parsePresence(
  data: unknown,
  excludeUserId?: string
): { cursors: RemoteCursor[]; viewportsByUserId: Map<string, UserViewport> } {
  const cursors: RemoteCursor[] = [];
  const viewportsByUserId = new Map<string, UserViewport>();
  if (!data || typeof data !== "object") return { cursors, viewportsByUserId };
  const now = Date.now();

  for (const [userId, value] of Object.entries(data)) {
    if (excludeUserId && userId === excludeUserId) continue;
    const pos = value as {
      x?: number;
      y?: number;
      updatedAt: number;
      displayName?: string;
      scale?: number;
      centerBoardX?: number;
      centerBoardY?: number;
    };
    if (!pos) continue;
    const updatedAt = pos.updatedAt ?? 0;
    if (now - updatedAt > STALE_CURSOR_MS) continue;

    const hasViewport =
      typeof pos.scale === "number" &&
      typeof pos.centerBoardX === "number" &&
      typeof pos.centerBoardY === "number";

    if (hasViewport) {
      viewportsByUserId.set(userId, {
        scale: pos.scale as number,
        centerBoardX: pos.centerBoardX as number,
        centerBoardY: pos.centerBoardY as number,
        updatedAt,
      });
    }

    if (typeof pos.x === "number" && typeof pos.y === "number") {
      const cursor: RemoteCursor = {
        userId,
        x: pos.x,
        y: pos.y,
        updatedAt,
        displayName: pos.displayName,
        color: userIdToColor(userId),
      };
      if (hasViewport) {
        cursor.scale = pos.scale as number;
        cursor.centerBoardX = pos.centerBoardX as number;
        cursor.centerBoardY = pos.centerBoardY as number;
      }
      cursors.push(cursor);
    }
  }
  return { cursors, viewportsByUserId };
}

export function useRemoteCursors(boardId: string, excludeUserId?: string) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [viewportsByUserId, setViewportsByUserId] = useState<
    Map<string, UserViewport>
  >(new Map());
  const pendingRef = useRef<RemoteCursor[] | null>(null);
  const pendingViewportsRef = useRef<Map<string, UserViewport>>(new Map());
  const lastFlushRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const flushPending = useCallback(() => {
    rafRef.current = null;
    if (typeof document !== "undefined" && document.hidden) return;
    const pending = pendingRef.current;
    const viewports = pendingViewportsRef.current;
    const now = performance.now();
    if (now - lastFlushRef.current < DISPLAY_THROTTLE_MS && (pending || viewports.size > 0)) {
      rafRef.current = requestAnimationFrame(flushPending);
      return;
    }
    lastFlushRef.current = now;
    if (pending) {
      pendingRef.current = null;
      setCursors(pending);
    }
    setViewportsByUserId(new Map(viewports));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const filtered = prev.filter((c) => !isCursorStale(c.updatedAt));
        return filtered.length === prev.length ? prev : filtered;
      });
      setViewportsByUserId((prev) => {
        const next = new Map(prev);
        let changed = false;
        next.forEach((v, userId) => {
          if (now - v.updatedAt > STALE_CURSOR_MS) {
            next.delete(userId);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 2000);

    const db = getFirebaseDatabase();
    const presenceRef = ref(db, `presence/${boardId}`);

    const onVisibilityChange = () => {
      if (!document.hidden && (pendingRef.current || pendingViewportsRef.current?.size)) {
        lastFlushRef.current = 0;
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(flushPending);
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const parsed = parsePresence(snapshot.val(), excludeUserId);
      pendingRef.current = parsed.cursors;
      pendingViewportsRef.current = parsed.viewportsByUserId;
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

  return { cursors, viewportsByUserId };
}
