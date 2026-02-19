export const GRID_SIZE = 20;

export function snapToGrid(value: number, gridSize = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPos(
  x: number,
  y: number,
  enabled: boolean,
  gridSize = GRID_SIZE
): { x: number; y: number } {
  if (!enabled) return { x, y };
  return { x: snapToGrid(x, gridSize), y: snapToGrid(y, gridSize) };
}
