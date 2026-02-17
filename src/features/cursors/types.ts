export interface CursorPosition {
  x: number;
  y: number;
  updatedAt: number;
}

export interface RemoteCursor extends CursorPosition {
  userId: string;
  color?: string;
  displayName?: string;
}
