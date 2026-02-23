import type { BoardStateSummary } from "@/features/ai-agent/board-agent-types";

/** Detect if the user is asking what is on the board (so we can force a full list reply). */
export function isAskingWhatIsOnBoard(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return (
    /what('s| is)\s+(currently\s+)?on the board/.test(normalized) ||
    /what('s| is)\s+on there/.test(normalized) ||
    /(describe|list|show)\s+(me\s+)?(what's\s+)?(on\s+)?the board/.test(normalized) ||
    /(what|anything)\s+on the board/.test(normalized) ||
    normalized === "what is on the board" ||
    normalized === "what's on the board"
  );
}

/** Format board state for "what's on the board" replies: short, readable list. */
export function formatBoardStateList(state: BoardStateSummary[]): string {
  if (state.length === 0) return "The board is empty.";
  const lines = state.map((el, i) => {
    if (el.type === "sticky-note") {
      const text = el.text ? ` — "${el.text}"` : "";
      return `${i + 1}. Sticky note${el.color ? ` (${el.color})` : ""}${text}`;
    }
    if (el.type === "shape") {
      const kind = el.kind ?? "shape";
      return `${i + 1}. ${kind}${el.fill || el.color ? ` (${el.fill || el.color})` : ""}`;
    }
    if (el.type === "text") {
      return `${i + 1}. Text${el.text ? ` — "${el.text}"` : ""}`;
    }
    if (el.type === "frame") {
      return `${i + 1}. Frame${el.title ? ` — "${el.title}"` : ""}`;
    }
    if (el.type === "connector") {
      return `${i + 1}. Connector`;
    }
    return `${i + 1}. ${el.type}`;
  });
  return `On the board:\n${lines.join("\n")}`;
}
