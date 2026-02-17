/**
 * Sticky Notes feature slice - Vertical Slice: sticky-notes
 */

export interface StickyNoteElement {
  id: string;
  type: "sticky-note";
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

/** Firestore document shape for boards/{boardId}/elements/{elementId} */
export interface StickyNoteDoc {
  type: "sticky-note";
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

/** RTDB ephemeral - active drag state */
export interface DraggingState {
  elementId: string;
  x: number;
  y: number;
  updatedAt: number;
}
