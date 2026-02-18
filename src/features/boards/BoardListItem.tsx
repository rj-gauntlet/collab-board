"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { UserBoard } from "./userBoardActions";
import { updateBoardName } from "./userBoardActions";

type Props = {
  board: UserBoard;
  userId: string;
  onDelete: (boardId: string) => void;
};

function CopyIcon() {
  return (
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
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function PencilIcon() {
  return (
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
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
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
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function BoardListItem({ board, userId, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(board.name);
  const [copySuccess, setCopySuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = board.name || `/${board.boardId}`;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = typeof window !== "undefined" ? `${window.location.origin}/${board.boardId}` : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleSaveName = async () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed !== board.name) {
      await updateBoardName(userId, board.boardId, trimmed);
    }
    setEditValue(board.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(board.name);
    }
  };

  return (
    <li className="group font-sans flex items-center gap-3 rounded-xl border border-[#ffe0b2] bg-white px-4 py-3 shadow-sm transition hover:bg-[#fff8e1]">
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-[#ff8f00] bg-[#fffbf0] px-2 py-1 font-mono text-sm outline-none focus:ring-1 focus:ring-[#ff8f00]"
            placeholder={`/${board.boardId}`}
          />
        ) : (
          <Link
            href={`/${board.boardId}`}
            className="font-medium text-[#3e2723] hover:text-[#ff8f00]"
          >
            <span className="truncate">{displayName}</span>
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsEditing(true);
            setEditValue(board.name);
          }}
          className="rounded p-1.5 text-[#5d4037] transition hover:bg-[#fff8e1] hover:text-[#ff8f00]"
          title="Rename board"
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          onClick={handleCopyUrl}
          className={`rounded p-1.5 text-[#5d4037] transition hover:bg-[#fff8e1] hover:text-[#ff8f00] ${
            copySuccess ? "text-green-600" : ""
          }`}
          title={copySuccess ? "Copied!" : "Copy URL"}
        >
          <CopyIcon />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDelete(board.boardId);
          }}
          className="rounded p-1.5 text-[#5d4037] transition hover:bg-red-100 hover:text-red-700"
          title="Delete board"
        >
          <DeleteIcon />
        </button>
      </div>
    </li>
  );
}
