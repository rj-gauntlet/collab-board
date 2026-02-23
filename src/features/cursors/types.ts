export interface CursorPosition {
  x: number;
  y: number;
  updatedAt: number;
  displayName?: string;
  /** Current viewport (for "Go to user's view"): board-space center of view + scale so it works across window sizes. */
  scale?: number;
  centerBoardX?: number;
  centerBoardY?: number;
}

export interface RemoteCursor extends CursorPosition {
  userId: string;
  color?: string;
  displayName?: string;
  /** Viewport for "Go to user's view" */
  scale?: number;
  centerBoardX?: number;
  centerBoardY?: number;
}
