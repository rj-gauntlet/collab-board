/**
 * Types for the AI Board Agent: board state summary sent to the model,
 * and tool argument shapes (for type-safe execution on the client).
 */

/** Bounding-box elements (notes, shapes, text, frames) */
export interface BoardStateSummaryBounded {
  id: string;
  type: "sticky-note" | "shape" | "text" | "frame";
  text?: string;
  title?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  fill?: string;
  kind?: string;
}

/** Connectors have from/to, not a bounding box */
export interface BoardStateSummaryConnector {
  id: string;
  type: "connector";
  fromId: string;
  toId: string;
}

export type BoardStateSummary = BoardStateSummaryBounded | BoardStateSummaryConnector;

/** Tool: create_sticky_note */
export interface CreateStickyNoteArgs {
  text: string;
  color?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/** Tool: create_shape */
export interface CreateShapeArgs {
  shapeType: "rect" | "circle" | "triangle";
  fill?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/** Tool: create_frame */
export interface CreateFrameArgs {
  title: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/** Tool: create_frames — multiple frames in one call */
export interface CreateFramesArgs {
  items: Array<{
    title: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }>;
}

/** Tool: create_connector */
export interface CreateConnectorArgs {
  fromId: string;
  toId: string;
  label?: string;
  style?: "line" | "arrow";
}

/** Tool: move_elements */
export interface MoveElementsArgs {
  ids: string[];
  dx: number;
  dy: number;
}

/** Tool: update_elements - partial updates by id */
export interface UpdateElementsArgs {
  updates: Array<{
    id: string;
    text?: string;
    title?: string;
    color?: string;
    fill?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }>;
}

/** Tool: delete_elements */
export interface DeleteElementsArgs {
  ids: string[];
}

/** Tool: arrange_grid */
export interface ArrangeGridArgs {
  ids: string[];
  columns?: number;
  spacing?: number;
}

/** Tool: resize_frame_to_fit — resize a frame to the bounding box of elements inside it */
export interface ResizeFrameToFitArgs {
  frameId: string;
  padding?: number;
}

/** Tool: distribute_elements — space elements evenly in a row or column */
export interface DistributeElementsArgs {
  ids: string[];
  direction: "horizontal" | "vertical";
  spacing?: number;
}

export type BoardAgentToolName =
  | "create_sticky_note"
  | "create_shape"
  | "create_frame"
  | "create_frames"
  | "create_connector"
  | "move_elements"
  | "update_elements"
  | "delete_elements"
  | "arrange_grid"
  | "resize_frame_to_fit"
  | "distribute_elements";
