"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "ai/react";
import type { WhiteboardCanvasHandle } from "@/features/whiteboard";
import {
  executeBoardAgentTools,
  getToolCallsFromMessage,
} from "./executeBoardAgentTools";
import type { BoardStateSummary } from "./board-agent-types";
import {
  loadBoardAgentChat,
  saveBoardAgentChat,
  formatMessageTime,
  type StoredMessage,
} from "./boardAgentChatPersistence";

interface BoardAgentChatProps {
  boardId: string;
  canvasRef: React.RefObject<WhiteboardCanvasHandle | null>;
  getBoardState: () => BoardStateSummary[];
  className?: string;
}

export function BoardAgentChat({
  boardId,
  canvasRef,
  getBoardState,
  className = "",
}: BoardAgentChatProps) {
  const executedMessageIdsRef = useRef<Set<string>>(new Set());
  const createdAtByIdRef = useRef<Map<string, number>>(new Map());

  const [initialMessages] = useState<StoredMessage[]>(() => {
    const loaded = loadBoardAgentChat(boardId);
    const map = new Map<string, number>();
    loaded.forEach((m) => {
      if (m.createdAt != null) map.set(m.id, m.createdAt);
    });
    createdAtByIdRef.current = map;
    return loaded;
  });

  const onFinish = useCallback(() => {}, []);

  const {
    messages,
    input,
    setInput,
    append,
    status,
    error,
  } = useChat({
    api: "/api/ai/board-agent",
    body: { boardId },
    onFinish,
    initialMessages,
  });

  // Run tool execution when the latest assistant message has tool invocations
  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant" || !last.id) return;
    if (executedMessageIdsRef.current.has(last.id)) return;
    const toolCalls = getToolCallsFromMessage(last as Parameters<typeof getToolCallsFromMessage>[0]);
    if (toolCalls.length > 0) {
      executedMessageIdsRef.current.add(last.id);
      executeBoardAgentTools(canvasRef.current, toolCalls);
    }
  }, [messages, status, canvasRef]);

  // Persist chat history (3-day retention); assign createdAt for new messages
  useEffect(() => {
    if (status === "streaming" || messages.length === 0) return;
    const now = Date.now();
    const map = createdAtByIdRef.current;
    messages.forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, now);
    });
    saveBoardAgentChat(boardId, messages, map);
  }, [boardId, messages, status]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const text = input.trim();
      if (!text) return;
      const boardState = getBoardState();
      setInput("");
      append(
        { role: "user", content: text },
        { body: { boardId, boardState } }
      );
    },
    [input, setInput, append, boardId, getBoardState]
  );

  return (
    <div
      className={`font-sans flex flex-col rounded-lg border border-[#ffe0b2] bg-[#fff8e1] shadow-md ${className}`}
      style={{ minWidth: 280, maxWidth: 360 }}
    >
      <div className="rounded-t-lg border-b border-[#e65100]/30 bg-[#ff8f00] px-3 py-2">
        <h3 className="text-sm font-semibold text-white">
          CollabBot
        </h3>
        <p className="text-xs text-white/90">
          Ask to add, move, or arrange elements in plain English.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[320px] p-2 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-[#5d4037]/70 italic">
            e.g. &quot;Add a yellow sticky note that says User Research&quot;
          </p>
        )}
        {messages.map((m) => {
          const createdAt = (m as StoredMessage).createdAt ?? createdAtByIdRef.current.get(m.id);
          const timeLabel = createdAt ? formatMessageTime(createdAt) : "Just now";
          return (
          <div
            key={m.id}
            className={`text-sm ${
              m.role === "user"
                ? "text-right"
                : "text-left text-[#5d4037]"
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-[#ff8f00]">
                {m.role === "user" ? "You" : "CollabBot"}:
              </span>
              <span className="text-xs text-[#5d4037]/60" title={createdAt ? new Date(createdAt).toLocaleString() : undefined}>
                {timeLabel}
              </span>
            </div>
            <div className="mt-0.5">
            {m.parts?.map((part, i) => {
              if (part.type === "text" && "text" in part) {
                return <span key={i}>{part.text}</span>;
              }
              if (part.type === "tool-invocation" && "toolInvocation" in part) {
                const inv = (part as { toolInvocation: { toolName: string } }).toolInvocation;
                return (
                  <span key={i} className="text-xs text-[#5d4037]/70">
                    [Tool: {inv.toolName}]
                  </span>
                );
              }
              return null;
            })}
            {!m.parts?.length && m.content && <span>{m.content}</span>}
            </div>
          </div>
          );
        })}
        {status === "streaming" && (
          <p className="text-xs text-[#5d4037]/70">Thinking…</p>
        )}
      </div>
      {error && (
        <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
          {error.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="p-2 border-t border-[#ffe0b2]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a sticky note…"
          className="w-full rounded-md border border-[#ffe0b2] bg-white px-3 py-2 text-sm text-[#5d4037] placeholder-[#5d4037]/50 focus:border-[#ff8f00] focus:outline-none focus:ring-1 focus:ring-[#ff8f00]"
          disabled={status === "streaming"}
          data-testid="board-agent-input"
        />
      </form>
    </div>
  );
}
