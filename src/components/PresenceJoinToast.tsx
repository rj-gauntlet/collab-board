"use client";

import { useEffect, useState, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import { userIdToColor } from "@/features/cursors";

const TOAST_DURATION_MS = 3000;

interface PresenceJoinToastProps {
  boardId: string;
  currentUserId: string;
}

type ToastState = { displayName: string; userId: string } | null;

export function PresenceJoinToast({ boardId, currentUserId }: PresenceJoinToastProps) {
  const [toast, setToast] = useState<ToastState>(null);
  const [isExiting, setIsExiting] = useState(false);
  const previousUserIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!boardId) return;

    const rtdb = getFirebaseDatabase();
    const presenceRef = ref(rtdb, `presence/${boardId}`);

    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      const current = new Set<string>();
      const displayNames: Record<string, string> = {};

      if (data && typeof data === "object") {
        for (const [userId, value] of Object.entries(data)) {
          const v = value as { updatedAt?: number; displayName?: string | null };
          if (v && typeof v.updatedAt === "number") {
            current.add(userId);
            const name = v.displayName && typeof v.displayName === "string"
              ? v.displayName
              : "Someone";
            displayNames[userId] = name;
          }
        }
      }

      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        previousUserIdsRef.current = current;
        return;
      }

      const previous = previousUserIdsRef.current;
      for (const uid of current) {
        if (previous.has(uid)) continue;
        if (uid === currentUserId) continue;
        const displayName = displayNames[uid] ?? "Someone";
        setToast({ displayName, userId: uid });
        setIsExiting(false);
        break;
      }
      previousUserIdsRef.current = current;
    });

    return () => unsubscribe();
  }, [boardId, currentUserId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      setIsExiting(true);
    }, TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!isExiting) return;
    const t = setTimeout(() => setToast(null), 220);
    return () => clearTimeout(t);
  }, [isExiting]);

  if (!toast) return null;

  const accentColor = userIdToColor(toast.userId);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`font-sans fixed left-0 right-0 z-[90] flex items-center gap-3 border-b border-[#ffe0b2] bg-[#fffbf0] px-4 py-2 text-sm shadow-md transition-all duration-200 ${
        isExiting ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"
      }`}
      style={{
        top: "3.5rem",
        borderLeftWidth: "4px",
        borderLeftColor: accentColor,
        borderLeftStyle: "solid",
      }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: accentColor }}
        aria-hidden
      />
      <span className="text-[#5d4037]">
        <span className="font-semibold" style={{ color: accentColor }}>
          {toast.displayName}
        </span>
        {" "}joined the board
      </span>
    </div>
  );
}
