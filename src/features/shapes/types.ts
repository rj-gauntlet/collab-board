/**
 * Shapes feature slice - Vertical Slice: shapes
 */

export type ShapeKind = "rect" | "triangle" | "circle";

export interface ShapeElement {
  id: string;
  type: "shape";
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

/** Firestore document shape for boards/{boardId}/elements/{elementId} */
export interface ShapeDoc {
  type: "shape";
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
