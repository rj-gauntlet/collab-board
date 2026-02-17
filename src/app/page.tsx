"use client";

import { useRef, useCallback, useState } from "react";
import {
  WhiteboardCanvas,
  WhiteboardErrorBoundary,
  type WhiteboardCanvasHandle,
} from "@/features/whiteboard";
import { Toolbar } from "@/features/toolbar";
import { useSmartCluster } from "@/features/ai-agent";
import type { Tool } from "@/features/toolbar";

const DEMO_BOARD_ID = "demo-board";
const DEMO_USER_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? `user-${crypto.randomUUID().slice(0, 8)}`
    : `user-${Date.now().toString(36)}`;

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const canvasRef = useRef<WhiteboardCanvasHandle>(null);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 500;

  const { runSmartCluster, isLoading, message, clearMessage } = useSmartCluster(
    useCallback(() => canvasRef.current?.getNotes() ?? [], []),
    useCallback(
      (notes) => canvasRef.current?.createNotesFromAI(notes),
      []
    ),
    { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-100 dark:bg-zinc-950">
      <div className="z-10 w-full max-w-4xl space-y-4">
        <h1 className="text-center text-4xl font-extrabold text-zinc-900 dark:text-zinc-100">
          CollabBoard <span className="text-blue-600">MVP</span>
        </h1>
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Draw with the Pen tool. Add sticky notes with the Note tool. Click
          Magic to categorize ideas into themes.
        </p>
        <div className="flex flex-col items-center gap-2">
          <Toolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onMagicClick={runSmartCluster}
            isMagicLoading={isLoading}
          />
          {message && (
            <div
              className={`flex w-full max-w-md items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm ${
                message.type === "empty"
                  ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                  : message.type === "error"
                    ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200"
                    : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
              }`}
            >
              <span>{message.text}</span>
              <button
                type="button"
                onClick={clearMessage}
                className="shrink-0 font-medium underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
        <WhiteboardErrorBoundary>
          <WhiteboardCanvas
            ref={canvasRef}
            boardId={DEMO_BOARD_ID}
            userId={DEMO_USER_ID}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            activeTool={activeTool}
            isAiLoading={isLoading}
          />
        </WhiteboardErrorBoundary>
      </div>
    </main>
  );
}