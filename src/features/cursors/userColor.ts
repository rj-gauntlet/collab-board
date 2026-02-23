/**
 * Stable color per user (same userId → same color everywhere: cursors, Users list).
 * Uses a simple string hash so we don't need to store colors in the backend.
 */
export const USER_CURSOR_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

export function userIdToColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_CURSOR_COLORS.length;
  return USER_CURSOR_COLORS[index];
}
