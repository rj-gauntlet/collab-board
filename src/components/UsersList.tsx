"use client";

import { useState, useRef, useEffect } from "react";
import { useBoardUsers } from "@/features/users";
import { useRegisterBoardUser } from "@/features/users";
import { userIdToColor } from "@/features/cursors";
import type { RemoteCursor } from "@/features/cursors";

interface UsersListProps {
  boardId: string;
  currentUserId: string;
  currentDisplayName?: string | null;
  currentEmail?: string | null;
  /** Cursors from presence (used to show "Go to view" when they have viewport). */
  remoteCursors?: RemoteCursor[];
  /** User IDs that have viewport data (so we show "Go to view" even when cursor is off-canvas). */
  viewportsByUserId?: Map<string, unknown>;
  /** Called when user chooses "Go to [name]'s view". */
  onGoToUserView?: (userId: string) => void;
}

export function UsersList({
  boardId,
  currentUserId,
  currentDisplayName,
  currentEmail,
  remoteCursors = [],
  viewportsByUserId,
  onGoToUserView,
}: UsersListProps) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useRegisterBoardUser(
    boardId,
    currentUserId,
    currentDisplayName,
    currentEmail
  );

  const users = useBoardUsers(boardId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={listRef} className="relative font-sans">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-white/90 transition hover:bg-white/20 hover:text-white"
        title="Users on this board"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>{users.length} users</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-[#ffe0b2] bg-[#fff8e1] py-1 shadow-lg"
          role="menu"
        >
          <div className="border-b border-[#ffe0b2] px-3 py-2 text-xs font-medium text-[#5d4037]">
            Users on this board
          </div>
          {users.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[#5d4037]">
              No other users yet
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {users.map((u) => {
                const color = userIdToColor(u.userId);
                const cursorWithView = remoteCursors.find(
                  (c) =>
                    c.userId === u.userId &&
                    c.scale != null &&
                    c.centerBoardX != null &&
                    c.centerBoardY != null
                );
                const hasViewport =
                  cursorWithView || viewportsByUserId?.has(u.userId);
                const canGoToView =
                  u.userId !== currentUserId && hasViewport && onGoToUserView;
                return (
                  <li
                    key={u.userId}
                    className="flex items-center gap-2 border-b border-[#ffe0b2]/50 px-3 py-2 text-sm last:border-b-0"
                    role="menuitem"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full border border-white shadow-sm"
                      style={{
                        backgroundColor: u.online ? color : "#e0e0e0",
                        borderColor: u.online ? color : "#bdbdbd",
                      }}
                      title={u.online ? "Online" : "Offline — same color as their cursor when present"}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[#3e2723]">
                      {u.displayName}
                      {u.userId === currentUserId && (
                        <span className="ml-1 text-[#5d4037]">(you)</span>
                      )}
                    </span>
                    {canGoToView && (
                      <button
                        type="button"
                        onClick={() => onGoToUserView(u.userId)}
                        title={`Go to ${u.displayName}'s view`}
                        className="flex shrink-0 items-center justify-center rounded p-1 text-[#5d4037] transition hover:bg-[#ffe0b2]/50 hover:text-[#3e2723]"
                        aria-label={`Go to ${u.displayName}'s view`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
