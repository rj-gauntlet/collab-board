"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  WhiteboardCanvas,
  WhiteboardErrorBoundary,
  type WhiteboardCanvasHandle,
} from "@/features/whiteboard";
import { Toolbar } from "@/features/toolbar";
import type { Tool } from "@/features/toolbar";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { useAuth } from "@/features/auth";
import { UsersList } from "@/components/UsersList";
import { generateBoardId } from "@/lib/utils";
import { addUserBoard } from "@/features/boards/userBoardActions";
import { useBoardName } from "@/features/boards/useBoardName";
import { useBoardExists } from "@/features/boards/useBoardExists";
import { setBoardName } from "@/features/boards/userBoardActions";
import { useSmartCluster, BoardAgentChat } from "@/features/ai-agent";

export default function BoardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const boardId = typeof params.boardId === "string" ? params.boardId : null;
  const isE2E = searchParams.get("e2e") === "1";

  const { user, loading, displayName, signInWithGoogle, signOut } = useAuth();
  const [activeTool, setActiveTool] = useState<Tool>("hand");
  const [selectedCount, setSelectedCount] = useState(0);
  const [perfMonitorVisible, setPerfMonitorVisible] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameEditValue, setNameEditValue] = useState("");
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const canvasRef = useRef<WhiteboardCanvasHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(() =>
    typeof window !== "undefined"
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 800, height: 500 }
  );
  // Track the device pixel ratio so the Konva Stage can re-render its canvas
  // buffer at the correct resolution after a browser-zoom change.
  const [pixelRatio, setPixelRatio] = useState(() =>
    typeof window !== "undefined" ? window.devicePixelRatio : 1
  );
  const [e2eBoardState, setE2eBoardState] = useState<string>("[]");

  // Expose board state for e2e tests when ?e2e=1
  useEffect(() => {
    if (!isE2E || !boardId) return;
    const id = setInterval(() => {
      const state = canvasRef.current?.getBoardState() ?? [];
      setE2eBoardState(JSON.stringify(state));
    }, 300);
    return () => clearInterval(id);
  }, [isE2E, boardId]);

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const applySize = (w: number, h: number) => {
      // Ceil instead of floor: a canvas 1 CSS-pixel too large is invisible;
      // a canvas 1 CSS-pixel too small leaves an unrendered sliver.
      const cw = Math.ceil(w);
      const ch = Math.ceil(h);
      setCanvasSize((prev) =>
        prev.width === cw && prev.height === ch ? prev : { width: cw, height: ch }
      );
      // Also refresh the pixel ratio (changes when browser zoom changes).
      setPixelRatio(window.devicePixelRatio);
    };

    // Primary: ResizeObserver on the container — fires on any layout change.
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applySize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(el);

    // Secondary: visualViewport resize fires AFTER the browser has finished
    // re-laying-out following a zoom change, giving accurate dimensions where
    // the ResizeObserver callback might still see stale values.
    const onVVResize = () => {
      const rect = el.getBoundingClientRect();
      applySize(rect.width, rect.height);
    };
    window.visualViewport?.addEventListener("resize", onVVResize);
    // Tertiary: plain window resize as a catch-all.
    window.addEventListener("resize", onVVResize);

    // Initial measurement.
    const rect = el.getBoundingClientRect();
    applySize(rect.width, rect.height);

    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", onVVResize);
      window.removeEventListener("resize", onVVResize);
    };
  }, []);

  const resolvedDisplayName = displayName ?? (user ? "Anonymous" : null);
  const boardName = useBoardName(boardId ?? null);
  const { exists, loading: existsLoading } = useBoardExists(boardId ?? null, user?.uid);

  const getNotes = useCallback(() => canvasRef.current?.getNotes() ?? [], []);
  const createNotesFromAI = useCallback(
    (notes: Array<{ text: string; color: string; x: number; y: number }>) => {
      canvasRef.current?.createNotesFromAI(notes);
    },
    []
  );
  const { runSmartCluster, isLoading: smartClusterLoading, message: smartClusterMessage, clearMessage: clearSmartClusterMessage } = useSmartCluster(
    getNotes,
    createNotesFromAI,
    canvasSize
  );

  useEffect(() => {
    if (exists === true && boardId) {
      document.title = boardName
        ? `CollabBoard | ${boardName}`
        : `CollabBoard | ${boardId}`;
    } else {
      document.title = "CollabBoard";
    }
    return () => {
      document.title = "CollabBoard";
    };
  }, [exists, boardId, boardName]);

  const handleCreateBoard = async () => {
    if (!user) return;
    const newId = generateBoardId();
    await addUserBoard(user.uid, newId);
    window.open(`/${newId}`, "_blank");
  };

  const handleSaveBoardName = async () => {
    setNameEditing(false);
    if (!boardId) return;
    await setBoardName(boardId, nameEditValue, user?.uid);
  };

  if (loading) {
    return (
      <main className="font-sans flex h-screen items-center justify-center bg-[#fffbf0]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ffe0b2] border-t-[#ff8f00]" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="font-sans flex h-screen flex-col items-center justify-center gap-6 bg-[#fffbf0]">
        <h1 className="font-sans text-2xl font-extrabold tracking-tight text-[#3e2723]">
          CollabBoard
        </h1>
        <p className="font-sans text-[#5d4037]">
          Sign in with Google to collaborate on the whiteboard
        </p>
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="font-sans flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 shadow-md ring-1 ring-[#ffe0b2] transition hover:bg-[#fff8e1]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </main>
    );
  }

  if (!boardId) {
    return (
      <main className="font-sans flex h-screen items-center justify-center bg-[#fffbf0]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ffe0b2] border-t-[#ff8f00]" />
      </main>
    );
  }

  if (existsLoading) {
    return (
      <main className="font-sans flex h-screen items-center justify-center bg-[#fffbf0]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ffe0b2] border-t-[#ff8f00]" />
      </main>
    );
  }

  if (exists === false) {
    return (
      <main className="font-sans flex h-screen flex-col items-center justify-center gap-6 bg-[#fffbf0]">
        <h1 className="font-sans text-2xl font-bold text-[#3e2723]">
          Board not found
        </h1>
        <p className="font-sans text-[#5d4037]">
          This board does not exist. Create a new board from the home page.
        </p>
        <a
          href="/"
          className="font-sans rounded-lg bg-[#ff8f00] px-4 py-2.5 text-white transition hover:bg-[#e65100]"
        >
          Go to Your boards
        </a>
      </main>
    );
  }

  return (
    <main className="font-sans flex h-screen flex-col bg-[#fffbf0]">
      <header className="shrink-0 border-b border-[#ffe0b2] bg-[#ff8f00] px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="font-sans text-xl font-extrabold tracking-tight text-white sm:text-2xl hover:text-[#fff8e1] transition"
            >
              CollabBoard
            </a>
            <div className="flex items-center gap-1">
              {nameEditing ? (
                <input
                  type="text"
                  value={nameEditValue}
                  onChange={(e) => setNameEditValue(e.target.value)}
                  onBlur={handleSaveBoardName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveBoardName();
                    if (e.key === "Escape") {
                      setNameEditing(false);
                      setNameEditValue(boardName ?? "");
                    }
                  }}
                  autoFocus
                  placeholder={`/${boardId}`}
                  className="rounded border border-white/50 bg-white/20 px-2 py-0.5 text-sm text-white placeholder-white/60 outline-none focus:border-white"
                />
              ) : (
                <>
                  <span className="text-sm text-white/70 font-mono">
                    {boardName ? boardName : `/${boardId}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNameEditing(true);
                      setNameEditValue(boardName ?? "");
                    }}
                    className="rounded p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
                    title="Rename board"
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
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPerfMonitorVisible((v) => !v)}
              className={`rounded-md p-1.5 transition-colors ${
                perfMonitorVisible
                  ? "bg-white/30 text-white"
                  : "text-white/90 hover:bg-white/20 hover:text-white"
              }`}
              title="Toggle performance monitor"
              aria-pressed={perfMonitorVisible}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            </button>
            <PerformanceMonitor visible={perfMonitorVisible} />
            <button
              type="button"
              onClick={handleCreateBoard}
              className="rounded-md p-1.5 text-white/90 transition-colors hover:bg-white/20 hover:text-white"
              title="New board"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Clear all content from the canvas?")) {
                  canvasRef.current?.clearCanvas();
                }
              }}
              className="rounded-md p-1.5 text-white/90 transition-colors hover:bg-white/20 hover:text-white"
              title="Clear canvas"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <UsersList
              boardId={boardId}
              currentUserId={user.uid}
              currentDisplayName={resolvedDisplayName}
              currentEmail={user.email ?? null}
            />
            <span className="font-sans text-sm text-white/90">
              {resolvedDisplayName}
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="font-sans rounded-md px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/20 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Smart Cluster message toast */}
      {smartClusterMessage && (
        <div
          role="status"
          className={`font-sans flex items-center justify-between gap-4 px-4 py-2 text-sm ${
            smartClusterMessage.type === "success"
              ? "bg-emerald-100 text-emerald-800 border-b border-emerald-200"
              : smartClusterMessage.type === "error"
                ? "bg-red-100 text-red-800 border-b border-red-200"
                : "bg-amber-100 text-amber-800 border-b border-amber-200"
          }`}
        >
          <span>{smartClusterMessage.text}</span>
          <button
            type="button"
            onClick={clearSmartClusterMessage}
            className="shrink-0 rounded px-2 py-0.5 font-medium opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        ref={canvasContainerRef}
        className="relative min-h-0 flex-1 w-full"
        style={{ minHeight: 0 }}
      >
        <div className="absolute left-4 top-4 z-10">
          <div className="rounded-lg border border-[#ffe0b2] bg-[#fff8e1] px-2 py-2 shadow-md">
            <Toolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              hasSelection={selectedCount > 0}
              onDeleteSelection={() => canvasRef.current?.deleteSelection?.()}
              onUndo={() => canvasRef.current?.undo()}
              onRedo={() => canvasRef.current?.redo()}
              onExport={() => canvasRef.current?.exportImage()}
              gridVisible={gridVisible}
              onGridToggle={() => setGridVisible((v) => !v)}
              snapEnabled={snapEnabled}
              onSnapToggle={() => setSnapEnabled((v) => !v)}
              onCluster={runSmartCluster}
              clusterLoading={smartClusterLoading}
              onCreateFlowchart={() => canvasRef.current?.createFlowchart?.()}
            />
          </div>
        </div>
        {/* Agent button above zoom controls (zoom is inside canvas at bottom-4 right-4) */}
        <div className="absolute bottom-14 right-4 z-20">
          <button
            type="button"
            onClick={() => setAgentPanelOpen((v) => !v)}
            className={`font-sans flex items-center gap-2 rounded-xl border border-[#e65100]/30 bg-[#ff8f00] px-3 py-2 text-sm font-medium text-white shadow-md transition ${
              agentPanelOpen ? "bg-[#e65100]" : "hover:bg-[#e65100]"
            }`}
            title="Toggle CollabBot"
            data-testid="agent-toggle"
          >
            CollabBot
          </button>
        </div>
        {agentPanelOpen && boardId && (
          <div className="absolute right-4 bottom-24 z-20 max-h-[min(60vh,420px)]" data-testid="board-agent-panel">
            <BoardAgentChat
              boardId={boardId}
              canvasRef={canvasRef}
              getBoardState={() => canvasRef.current?.getBoardState() ?? []}
              className="mb-2"
            />
          </div>
        )}
        {isE2E && (
          <div data-testid="board-state" data-state={e2eBoardState} aria-hidden className="hidden" />
        )}
        <div className="absolute inset-0">
          <WhiteboardErrorBoundary>
            <WhiteboardCanvas
              ref={canvasRef}
              boardId={boardId}
              userId={user.uid}
              displayName={resolvedDisplayName}
              width={canvasSize.width}
              height={canvasSize.height}
              pixelRatio={pixelRatio}
              activeTool={activeTool}
              gridVisible={gridVisible}
              snapEnabled={snapEnabled}
              onSelectionChange={setSelectedCount}
            />
          </WhiteboardErrorBoundary>
        </div>
      </div>
    </main>
  );
}
