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

/** Format board state as a single reply line (used when bypassing the model for "what's on the board"). */
export function formatBoardStateList(state: BoardStateSummary[]): string {
  if (state.length === 0) return "The board is empty.";
  const parts = state.map((el, i) => {
    const n = i + 1;
    if (el.type === "sticky-note") {
      const color = el.color ? ` ${el.color}` : "";
      const text = el.text ? ` with text \"${el.text}\"` : "";
      return `(${n}) a${color} sticky note${text}`;
    }
    if (el.type === "shape") {
      const color = el.fill || el.color ? ` ${el.fill || el.color}` : "";
      const kind = el.kind ? ` ${el.kind}` : " shape";
      return `(${n}) a${color}${kind}`;
    }
    if (el.type === "text") {
      const content = el.text ? ` \"${el.text}\"` : "";
      return `(${n}) a text element${content}`;
    }
    if (el.type === "frame") {
      const title = el.title ? ` \"${el.title}\"` : "";
      return `(${n}) a frame${title}`;
    }
    if (el.type === "connector") {
      return `(${n}) a connector from ${el.fromId} to ${el.toId}`;
    }
    return `(${n}) a ${el.type}`;
  });
  return `The board has: ${parts.join(", ")}.`;
}
