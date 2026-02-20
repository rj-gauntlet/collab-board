/**
 * Frames - visual containers to group/organize content areas
 */

/** Height of the frame title bar (content area starts below this). Used by canvas and agent. */
export const FRAME_TITLE_BAR_HEIGHT = 28;

export interface FrameElement {
  id: string;
  type: "frame";
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface FrameDoc {
  type: "frame";
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
