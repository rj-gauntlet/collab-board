/**
 * Frames - visual containers to group/organize content areas
 */

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
