/**
 * Standalone text elements (not sticky notes)
 */

export interface TextElement {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  bold?: boolean;
  italic?: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface TextElementDoc {
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  bold?: boolean;
  italic?: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
