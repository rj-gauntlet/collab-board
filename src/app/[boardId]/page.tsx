"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
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

export default function BoardPage() {
  const params = useParams();
  const boardId = typeof params.boardId === "string" ? params.boardId : null;

  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [activeTool, setActiveTool] = useState<Tool>("hand");
  const [perfMonitorVisible, setPerfMonitorVisible] = useState(false);
  const canvasRef = useRef<WhiteboardCanvasHandle>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(() =>
    typeof window !== "undefined"
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 800, height: 500 }
  );

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      const width = el.clientWidth || window.innerWidth;
      const height = el.clientHeight || window.innerHeight;
      setCanvasSize((prev) => {
        const w = Math.floor(width);
        const h = Math.floor(height);
        return prev.width === w && prev.height === h ? prev : { width: w, height: h };
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const displayName =
    user?.displayName ?? user?.email ?? (user ? "Anonymous" : null);

  const handleCreateBoard = () => {
    const newId = generateBoardId();
    window.open(`/${newId}`, "_blank");
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
          CollabBoard <span className="text-[#ff8f00]">MVP</span>
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

  return (
    <main className="font-sans flex h-screen flex-col bg-[#fffbf0]">
      <header className="shrink-0 border-b border-[#ffe0b2] bg-[#ff8f00] px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="font-sans text-xl font-extrabold tracking-tight text-white sm:text-2xl hover:text-[#fff8e1] transition"
            >
              CollabBoard <span className="font-medium text-[#fff8e1]">MVP</span>
            </a>
            <UsersList
              boardId={boardId}
              currentUserId={user.uid}
              currentDisplayName={displayName}
              currentEmail={user.email ?? null}
            />
            <span className="text-sm text-white/70 font-mono">/{boardId}</span>
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
            <button
              type="button"
              onClick={handleCreateBoard}
              className="font-sans rounded-md px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/20 hover:text-white"
            >
              New board
            </button>
            <span className="font-sans text-sm text-white/90">
              {displayName}
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
            />
          </div>
        </div>
        <div className="h-full w-full">
          <WhiteboardErrorBoundary>
            <WhiteboardCanvas
              ref={canvasRef}
              boardId={boardId}
              userId={user.uid}
              displayName={displayName}
              width={canvasSize.width}
              height={canvasSize.height}
              activeTool={activeTool}
            />
          </WhiteboardErrorBoundary>
        </div>
      </div>
    </main>
  );
}
