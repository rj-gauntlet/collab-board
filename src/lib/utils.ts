/**
 * Generates a unique, URL-safe board ID (12 hex chars).
 */
export function generateBoardId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
