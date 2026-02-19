/**
 * Connectors feature - lines/arrows between notes and shapes
 */

export type ConnectorStyle = "line" | "arrow";

export type ConnectorEndpointType = "note" | "shape";

export interface ConnectorElement {
  id: string;
  type: "connector";
  fromId: string;
  toId: string;
  fromType: ConnectorEndpointType;
  toType: ConnectorEndpointType;
  style: ConnectorStyle;
  stroke?: string;
  strokeWidth?: number;
  /** Render the line as a dashed stroke. */
  dashed?: boolean;
  /** Render the line with a smooth curve (quadratic bezier via perpendicular midpoint). */
  curved?: boolean;
  /** Show arrowheads on both ends. */
  bidirectional?: boolean;
  label?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConnectorDoc {
  type: "connector";
  fromId: string;
  toId: string;
  fromType: ConnectorEndpointType;
  toType: ConnectorEndpointType;
  style: ConnectorStyle;
  stroke?: string;
  strokeWidth?: number;
  dashed?: boolean;
  curved?: boolean;
  bidirectional?: boolean;
  label?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
