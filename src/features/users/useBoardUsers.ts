"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { db, getFirebaseDatabase } from "@/lib/firebase";

const ONLINE_THRESHOLD_MS = 10_000;
/** Remove users from the list after this long offline */
const OFFLINE_REMOVAL_MS = 60_000;

export interface BoardUser {
  userId: string;
  displayName: string;
  email?: string | null;
  online: boolean;
  /** Last activity timestamp (ms) from presence; use for "Last seen" display. */
  lastSeenAt: number;
}

export function useBoardUsers(boardId: string): BoardUser[] {
  const [usersFromFirestore, setUsersFromFirestore] = useState<
    Map<string, { displayName: string; email?: string | null }>
  >(new Map());
  const [presenceUpdatedAt, setPresenceUpdatedAt] = useState<
    Map<string, number>
  >(new Map());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!boardId) return;

    const usersRef = collection(db, "boardUsers", boardId, "users");
    const unsubscribe = onSnapshot(query(usersRef), (snapshot) => {
      const map = new Map<string, { displayName: string; email?: string | null }>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        map.set(docSnap.id, {
          displayName: data?.displayName ?? "Anonymous",
          email: data?.email ?? null,
        });
      });
      setUsersFromFirestore(map);
    });

    return () => unsubscribe();
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;

    const rtdb = getFirebaseDatabase();
    const presenceRef = ref(rtdb, `presence/${boardId}`);
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      setPresenceUpdatedAt((prev) => {
        const next = new Map(prev);
        if (data && typeof data === "object") {
          for (const [userId, value] of Object.entries(data)) {
            const pos = value as { updatedAt?: number };
            if (pos && typeof pos.updatedAt === "number") {
              const existing = next.get(userId) ?? 0;
              next.set(userId, Math.max(existing, pos.updatedAt));
            }
          }
        }
        return next;
      });
    });

    return () => unsubscribe();
  }, [boardId]);

  return useMemo(() => {
    const now = Date.now();
    void tick;
    const result: BoardUser[] = [];

    for (const [userId, meta] of usersFromFirestore) {
      const updatedAt = presenceUpdatedAt.get(userId) ?? 0;
      const offlineDuration = now - updatedAt;
      if (offlineDuration > OFFLINE_REMOVAL_MS) continue;

      const online = offlineDuration < ONLINE_THRESHOLD_MS;

      result.push({
        userId,
        displayName: meta.displayName,
        email: meta.email,
        online,
        lastSeenAt: updatedAt,
      });
    }

    return result.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" })
    );
  }, [usersFromFirestore, presenceUpdatedAt, tick]);
}
