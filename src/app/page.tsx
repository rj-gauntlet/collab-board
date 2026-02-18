"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth";
import { generateBoardId } from "@/lib/utils";
import { useUserBoards } from "@/features/boards/useUserBoards";
import { addUserBoard, deleteUserBoard } from "@/features/boards/userBoardActions";
import { BoardListItem } from "@/features/boards/BoardListItem";

export default function Home() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { boards, loading: boardsLoading } = useUserBoards(user?.uid);

  const handleCreateBoard = async () => {
    if (!user) return;
    const newId = generateBoardId();
    await addUserBoard(user.uid, newId);
    window.open(`/${newId}`, "_blank");
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!user || !confirm("Delete this board? All content will be removed.")) return;
    await deleteUserBoard(user.uid, boardId);
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

  const displayName = user.displayName ?? user.email ?? "Anonymous";

  return (
    <main className="font-sans flex min-h-screen flex-col bg-[#fffbf0]">
      <header className="shrink-0 border-b border-[#ffe0b2] bg-[#ff8f00] px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="font-sans text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            CollabBoard <span className="font-medium text-[#fff8e1]">MVP</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="font-sans text-sm text-white/90">{displayName}</span>
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

      <div className="flex flex-1 flex-col items-center gap-8 px-4 py-8">
        <h2 className="font-sans text-2xl font-bold text-[#3e2723]">
          Your boards
        </h2>
        <div className="flex w-full max-w-2xl flex-col gap-4">
          <button
            type="button"
            onClick={() => handleCreateBoard()}
            className="font-sans flex items-center gap-3 rounded-xl border-2 border-dashed border-[#ff8f00] bg-white px-8 py-6 text-[#3e2723] shadow-md transition hover:bg-[#fff8e1] hover:border-[#ffb74d]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ff8f00]/10 text-[#ff8f00]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
            <span className="font-semibold">Create new board</span>
          </button>
          {boardsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ffe0b2] border-t-[#ff8f00]" />
            </div>
          ) : boards.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {boards.map((board) => (
                <BoardListItem
                  key={board.id}
                  board={board}
                  userId={user.uid}
                  onDelete={handleDeleteBoard}
                />
              ))}
            </ul>
          ) : (
            <p className="font-sans text-sm text-[#5d4037]">
              No boards yet. Create one to get started.
            </p>
          )}
        </div>
        <p className="font-sans text-sm text-[#5d4037]">
          Each board has its own URL. Share it to collaborate with others.
        </p>
      </div>
    </main>
  );
}
