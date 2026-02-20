/**
 * Persist board agent chat messages to localStorage with 3-day retention and per-message timestamps.
 */

const STORAGE_KEY_PREFIX = "collab-board-agent-chat-";
const RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

export interface StoredMessage {
  id: string;
  role: string;
  content?: string;
  parts?: unknown[];
  createdAt?: number;
  [key: string]: unknown;
}

interface StoredChat {
  savedAt: number;
  messages: StoredMessage[];
}

function storageKey(boardId: string): string {
  return `${STORAGE_KEY_PREFIX}${boardId}`;
}

export function loadBoardAgentChat(boardId: string): StoredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(boardId));
    if (!raw) return [];
    const data = JSON.parse(raw) as StoredChat;
    if (!data?.messages || !Array.isArray(data.messages)) return [];
    if (Date.now() - data.savedAt > RETENTION_MS) {
      localStorage.removeItem(storageKey(boardId));
      return [];
    }
    return data.messages;
  } catch {
    return [];
  }
}

export function saveBoardAgentChat(
  boardId: string,
  messages: Array<{ id: string; role: string; content?: string; parts?: unknown[] }>,
  createdAtById: Map<string, number>
): void {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const stored: StoredMessage[] = messages.map((m) => ({
      ...m,
      createdAt: createdAtById.get(m.id) ?? now,
    }));
    const data: StoredChat = { savedAt: now, messages: stored };
    localStorage.setItem(storageKey(boardId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function formatMessageTime(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const t = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (d.getTime() >= today) return t;
  if (d.getTime() >= yesterday) return `Yesterday ${t}`;
  if (d.getTime() >= weekAgo) return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${t}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
