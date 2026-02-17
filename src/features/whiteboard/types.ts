/**
 * Whiteboard element types - Vertical Slice: whiteboard
 */

export interface LineElement {
  id: string;
  type: "line";
  points: number[];
  strokeWidth: number;
  strokeColor: string;
  createdBy: string;
  createdAt: number;
}

/** Active stroke being drawn (RTDB ephemeral) */
export interface ActiveStroke {
  points: number[];
  strokeWidth: number;
  strokeColor: string;
  updatedAt: number;
}

/** Firestore document shape for boards/{boardId}/elements/{elementId} */
export interface LineElementDoc {
  type: "line";
  points: number[];
  strokeWidth: number;
  strokeColor: string;
  createdBy: string;
  createdAt: number;
}
