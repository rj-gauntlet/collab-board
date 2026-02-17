export interface CursorPosition {
  x: number;
  y: number;
  updatedAt: number;
  displayName?: string;
}

export interface RemoteCursor extends CursorPosition {
  userId: string;
  color?: string;
  displayName?: string;
}
