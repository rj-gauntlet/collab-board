import type { BoardStateSummary } from "@/features/ai-agent/board-agent-types";

/** Map hex/rgb to a readable color name for "what's on the board" replies. */
function colorToName(value: string | undefined): string {
  if (value == null || value === "") return "";
  const normalized = value.trim().toLowerCase();
  if (/^(red|blue|green|yellow|orange|pink|purple|black|white|gray|grey|brown|cyan|magenta|teal|lime|navy|maroon|olive|silver|aqua)$/.test(normalized)) {
    return value.trim();
  }
  const hex = normalized.startsWith("#") ? normalized : normalized.replace(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/, (_, r, g, b) => {
    const hr = Number(r).toString(16).padStart(2, "0");
    const hg = Number(g).toString(16).padStart(2, "0");
    const hb = Number(b).toString(16).padStart(2, "0");
    return `#${hr}${hg}${hb}`;
  });
  const hexMap: Record<string, string> = {
    "#ff0000": "red", "#f00": "red",
    "#00ff00": "lime", "#0f0": "lime",
    "#0000ff": "blue", "#00f": "blue",
    "#ffff00": "yellow", "#ff0": "yellow",
    "#ffa500": "orange",
    "#ffc0cb": "pink", "#ff69b4": "hot pink",
    "#800080": "purple", "#a020f0": "purple",
    "#000000": "black", "#000": "black",
    "#ffffff": "white", "#fff": "white",
    "#808080": "gray", "#a9a9a9": "gray",
    "#8b4513": "brown", "#a52a2a": "brown",
    "#00ffff": "cyan", "#0ff": "cyan",
    "#ff00ff": "magenta", "#f0f": "magenta",
    "#008080": "teal",
    "#000080": "navy",
    "#800000": "maroon",
    "#808000": "olive",
    "#c0c0c0": "silver",
    "#fff8e1": "cream", "#ffe0b2": "peach", "#ff8f00": "orange", "#ffcdd2": "light pink",
    "#e3f2fd": "light blue", "#f3e5f5": "lavender", "#e8f5e9": "light green",
    "#fce4ec": "pink", "#f5f5f5": "light gray",
  };
  const key = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  return hexMap[key] ?? value.trim();
}

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

/** Format board state for "what's on the board" replies: one item per line, color names not RGB. */
export function formatBoardStateList(state: BoardStateSummary[]): string {
  if (state.length === 0) return "The board is empty.";
  const lines = state.map((el, i) => {
    if (el.type === "sticky-note") {
      const color = colorToName(el.color);
      const text = el.text ? ` — "${el.text}"` : "";
      return `${i + 1}. Sticky note${color ? ` (${color})` : ""}${text}`;
    }
    if (el.type === "shape") {
      const kind = el.kind ?? "shape";
      const color = colorToName(el.fill || el.color);
      return `${i + 1}. ${kind}${color ? ` (${color})` : ""}`;
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
