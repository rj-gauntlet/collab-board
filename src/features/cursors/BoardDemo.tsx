"use client";

import { BoardStage } from "./BoardStage";

const DEMO_BOARD_ID = "demo-board";
const DEMO_USER_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? `user-${crypto.randomUUID().slice(0, 8)}`
    : `user-${Date.now().toString(36)}`;

export function BoardDemo() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Move your mouse to sync your cursor. Open another tab to see other cursors.
      </p>
      <BoardStage
        boardId={DEMO_BOARD_ID}
        userId={DEMO_USER_ID}
        width={800}
        height={500}
      />
    </div>
  );
}
