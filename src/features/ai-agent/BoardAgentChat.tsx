"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useChat, type Message } from "ai/react";
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

const SUGGESTED_PROMPTS: { label: string; prompts: string[] }[] = [
  {
    label: "Brainstorm",
    prompts: [
      "Add 5 sticky notes for ideas",
      "Create a 4×4 grid of sticky notes",
      "Cluster these notes into themes",
    ],
  },
  {
    label: "Plan",
    prompts: [
      "Create a flowchart",
      "Create a user journey map with 5 stages",
      "Arrange these in a grid",
    ],
  },
  {
    label: "Analyze",
    prompts: [
      "Create a SWOT analysis",
      "Resize the frame to fit its contents",
      "Move the pink notes to the right",
    ],
  },
  {
    label: "See hierarchy",
    prompts: [
      "Create a frame and add 5 sticky notes inside it, and 3 sticky notes outside the frame",
    ],
  },
];

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
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const [initialMessages] = useState<StoredMessage[]>(() => {
    const loaded = loadBoardAgentChat(boardId);
    const map = new Map<string, number>();
    loaded.forEach((m) => {
      if (m.createdAt != null) map.set(m.id, m.createdAt);
      if (m.role === "assistant" && m.id && getToolCallsFromMessage(m as Parameters<typeof getToolCallsFromMessage>[0]).length > 0) {
        executedMessageIdsRef.current.add(m.id);
      }
    });
    createdAtByIdRef.current = map;
    return loaded;
  });

  const onFinish = useCallback(() => {}, []);

  const chatFetch = useCallback<typeof fetch>(
    (input, init) => {
      if (typeof input !== "string" || init?.method !== "POST" || typeof init?.body !== "string") {
        return fetch(input, init);
      }
      try {
        const body = JSON.parse(init.body) as Record<string, unknown>;
        body.boardId = boardId;
        body.boardState = getBoardState();
        return fetch(input, { ...init, body: JSON.stringify(body) });
      } catch {
        return fetch(input, init);
      }
    },
    [boardId, getBoardState]
  );

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
    fetch: chatFetch,
    onFinish,
    initialMessages: initialMessages as Message[],
  });

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    if (!wasAtBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, status]);

  const handleChatScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    wasAtBottomRef.current = distanceFromBottom <= 60;
  }, []);

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
      // Auto-fit view so new content is visible (delay for state/Firestore to update)
      const timeoutId = setTimeout(() => {
        canvasRef.current?.fitViewToContent?.();
      }, 400);
      return () => clearTimeout(timeoutId);
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
      className={`font-sans flex flex-col rounded-lg border border-[#ffe0b2] bg-[#fff8e1] shadow-md relative overflow-hidden ${className}`}
      style={{ minWidth: 280, maxWidth: 360 }}
    >
      <div className="rounded-t-lg border-b border-[#e65100]/30 bg-[#ff8f00] px-3 py-2 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">
              CollabBot
            </h3>
            <p className="text-xs text-white/90">
              Describe what you want in plain English.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuggestionsOpen((o) => !o)}
            className="shrink-0 rounded px-2 py-1 text-xs font-medium text-white/95 hover:bg-white/20 transition"
            title={suggestionsOpen ? "Close suggestions" : "Open suggestions"}
          >
            {suggestionsOpen ? "Close" : "Suggestions"}
          </button>
        </div>
      </div>
      <div className="flex-1 flex min-h-0 relative">
        {/* Drawer: slides in from the right over the chat */}
        <div
          className={`absolute inset-y-0 right-0 z-10 w-56 bg-[#fff8e1] border-l border-[#ffe0b2] shadow-lg flex flex-col transition-transform duration-200 ease-out ${
            suggestionsOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-hidden={!suggestionsOpen}
        >
          <div className="p-3 border-b border-[#ffe0b2] shrink-0">
            <p className="text-xs font-medium text-[#5d4037]">Suggested prompts</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {SUGGESTED_PROMPTS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-xs font-medium text-[#ff8f00]">{group.label}</p>
                <ul className="space-y-1">
                  {group.prompts.map((prompt) => (
                    <li key={prompt}>
                      <button
                        type="button"
                        onClick={() => {
                          setInput(prompt);
                          setSuggestionsOpen(false);
                        }}
                        className="w-full text-left text-xs text-[#5d4037] rounded-md px-2 py-1.5 bg-white hover:bg-[#fff3e0] border border-[#ffe0b2] hover:border-[#ff8f00]/50 transition"
                      >
                        {prompt}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        {/* Chat messages area */}
        <div
          ref={chatScrollRef}
          onScroll={handleChatScroll}
          className="flex-1 overflow-y-auto min-h-[200px] max-h-[320px] p-3 space-y-2"
          data-testid="board-agent-messages"
        >
        {messages.length === 0 && status !== "streaming" && (
          <p className="text-xs text-[#5d4037]/70 italic">
            Ask for anything — or open Suggestions to try examples.
          </p>
        )}
        {messages.map((m) => {
          const createdAt = (m as StoredMessage).createdAt ?? createdAtByIdRef.current.get(m.id);
          const timeLabel = createdAt ? formatMessageTime(createdAt) : "Just now";
          const isUser = m.role === "user";
          const toolParts =
            m.parts?.filter((p) => p.type === "tool-invocation" && "toolInvocation" in p).map((p) => (p as { toolInvocation: { toolName?: string } }).toolInvocation) ?? [];
          const textParts = m.parts?.filter((p) => p.type === "text" && "text" in p).map((p) => (p as { text: string }).text) ?? [];
          const fallbackContent = !m.parts?.length && m.content ? m.content : null;
          return (
            <div
              key={m.id}
              className={`flex py-1 ${isUser ? "justify-end" : "justify-start"}`}
              data-testid={isUser ? "board-agent-message-user" : "board-agent-message-assistant"}
            >
              <div
                className={`text-sm max-w-[85%] rounded-2xl px-3 py-2 ${
                  isUser
                    ? "bg-[#ff8f00]/20 text-[#5d4037]"
                    : "bg-white border border-[#ffe0b2] text-[#5d4037]"
                }`}
              >
                <div className={`flex items-center gap-2 flex-wrap ${isUser ? "justify-end" : ""}`}>
                  <span className="font-medium text-[#ff8f00]">
                    {isUser ? "You" : "CollabBot"}:
                  </span>
                  <span className="text-xs text-[#5d4037]/60" title={createdAt ? new Date(createdAt).toLocaleString() : undefined}>
                    {timeLabel}
                  </span>
                </div>
                <div className="mt-1.5" data-testid={isUser ? undefined : "board-agent-message-assistant-text"}>
                  {isUser ? (
                    <span>{(m.parts?.find((p) => p.type === "text" && "text" in p) as { text: string } | undefined)?.text ?? m.content ?? ""}</span>
                  ) : (
                    <>
                      {toolParts.length > 0 && (
                        <div className="text-xs text-[#5d4037]/70 mb-1.5 space-y-0.5">
                          {toolParts.map((inv, i) => (
                            <div key={i}>Tool: {inv.toolName ?? "tool"}</div>
                          ))}
                        </div>
                      )}
                      {(textParts.length > 0 || fallbackContent) && (
                        <div>
                          {textParts.length > 0 ? textParts.map((t, i) => <span key={i}>{t}</span>) : <span>{fallbackContent}</span>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {status === "streaming" && (
          <div className="flex items-center gap-2 py-2 text-sm text-[#5d4037]" data-testid="board-agent-streaming">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#ff8f00] border-t-transparent" aria-hidden />
            <span>CollabBot is thinking…</span>
          </div>
        )}
        </div>
      </div>
      {error && (
        <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
          {error.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#ffe0b2]">
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
